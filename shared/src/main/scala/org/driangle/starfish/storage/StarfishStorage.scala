package org.driangle.starfish.storage

import play.api.libs.json.JsValue

trait StarfishStorage {

  def save(clientId: String, location: String, mode: String, data: JsValue): Unit

  def load(clientId: String, key: String, scope: String): Option[JsValue]

  def loadAll(key : String) : Seq[JsValue]

  def containsKey(key: String): Boolean

  def deleteClientData(clientId: String): Unit
}
