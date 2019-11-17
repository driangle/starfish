package org.driangle.starfish.storage

import play.api.libs.json.{JsArray, JsNull, JsUndefined, JsValue, Json}


sealed trait SaveStrategy {
  def run(currentData: JsValue, newData: JsValue): JsValue
}

object SaveStrategy {
  def getStrategy(mode: String): SaveStrategy = mode match {
    case "set.add" => SetAdd
    case "list.add" => ListAdd
    case "replace" => Replace
  }
}

case object SetAdd extends SaveStrategy {

  def distinct(items: Seq[JsValue]): Seq[JsValue] = {
    items.groupBy(_ \ "id").flatMap({
      case (JsUndefined(), entries) => entries
      case (id, entries) => List(entries.last)
    }).toSeq
  }

  override def run(currentData: JsValue, newData: JsValue): JsValue = {
    (currentData, newData) match {
      case (JsNull, _) => newData
      case (JsArray(existingSet), _) => {
        val mergedSet: Seq[JsValue] = distinct(existingSet :+ newData)
        JsArray(mergedSet)
      }
      case (_, _) => {
        val mergedSet: Seq[JsValue] = distinct(List(currentData, newData))
        JsArray(mergedSet)
      }
    }
  }
}

case object ListAdd extends SaveStrategy {
  override def run(currentData: JsValue, newData: JsValue): JsValue = {
    (currentData, newData) match {
      case (JsNull, _) => newData
      case (JsArray(existingSet), _) => {
        val mergedSet: Seq[JsValue] = existingSet :+ newData
        JsArray(mergedSet)
      }
      case (_, _) => {
        val mergedSet: Seq[JsValue] = List(currentData, newData)
        JsArray(mergedSet)
      }
    }
  }
}

case object Replace extends SaveStrategy {
  override def run(currentData: JsValue, newData: JsValue): JsValue = newData
}

case class StorageLocation(data: Map[String, JsValue] = Map.empty) {
  def add(clientId: String, newData: JsValue, strategy: SaveStrategy): StorageLocation = {
    val finalData = strategy.run(this.data.get(clientId).getOrElse(JsNull), newData)
    copy(data + (clientId -> finalData))
  }

  def delete(clientId: String): StorageLocation = {
    copy(data - clientId)
  }
}

sealed trait LoadStrategy {
  def load(mclientId: String, storage: StorageLocation): Option[JsValue]
}

object LoadStrategy {
  def getStrategy(scope: String): LoadStrategy = scope match {
    case "self" => LoadSelf
    case "neighbors" => LoadNeighbors
    case "all" => LoadAll
  }
}

case object LoadSelf extends LoadStrategy {
  override def load(clientId: String, storage: StorageLocation): Option[JsValue] = {
    storage.data.get(clientId)
  }
}

case object LoadNeighbors extends LoadStrategy {
  override def load(clientId: String, storage: StorageLocation): Option[JsValue] = {
    val values = storage.data.filter({
      case (neighborId, _) => neighborId != clientId
    }).map({
      case (neighborId, neighborData) => Json.obj("clientId" -> neighborId, "data" -> neighborData)
    })
    if (values.isEmpty) {
      None
    } else {
      Some(Json.toJson(values))
    }
  }
}

case object LoadAll extends LoadStrategy {
  override def load(clientId: String, storage: StorageLocation): Option[JsValue] = {
    val values = storage.data.map({
      case (neighborId, neighborData) => Json.obj("clientId" -> neighborId, "data" -> neighborData)
    })
    if (values.isEmpty) {
      None
    } else {
      Some(Json.toJson(values))
    }
  }
}

class HashMapStarfishStorage extends StarfishStorage {

  var memory: Map[String, StorageLocation] = Map.empty

  override def save(clientId: String, key: String, mode: String, data: JsValue): Unit = {
    memory = memory.get(key) match {
      case None => memory + (key -> StorageLocation(Map(clientId -> data)))
      case Some(existing) => {
        val strategy = SaveStrategy.getStrategy(mode)
        memory + (key -> existing.add(clientId, data, strategy))
      }
    }
  }

  override def load(clientId: String, key: String, scope: String): Option[JsValue] = {
    val strategy = LoadStrategy.getStrategy(scope)
    memory.get(key)
      .flatMap(storage => strategy.load(clientId, storage))
  }

  override def containsKey(key: String): Boolean = memory.contains(key)

  override def deleteClientData(clientId: String): Unit = {
    memory = memory.map({
      case (key, storage) => (key, storage.delete(clientId))
    })
  }

  override def loadAll(key: String): Seq[JsValue] = {
    memory.get(key)
      .map(storage => storage.data.values.toSeq)
      .getOrElse(List.empty)
  }
}
