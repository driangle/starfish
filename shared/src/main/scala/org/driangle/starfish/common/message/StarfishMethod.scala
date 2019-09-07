package org.driangle.starfish.common.message

import play.api.libs.json.{JsNull, JsValue, Json, Reads, Writes}

case class StarfishMethod(name: String, arguments: JsValue = JsNull)

object StarfishMethod {

  val SERVER_PING = "sfp:server-ping"
  val SERVER_PONG = "sfp:server-pong"
  val CLIENT_PING = "sfp:client-ping"
  val CLIENT_PONG = "sfp:client-pong"
  val CORE_PONG = "sfp:core-pong"
  val SAVE_DATA = "sfp:save"
  val LOAD_DATA = "sfp:load"
  val DELETE_CLIENT_DATA = "sfp:delete-client-data"
  val BROADCAST = "sfp:broadcast"

  val CLIENT_SUBSCRIBE = "action:user-subscribe"
  val CLIENT_CONTROL = "action:client-control"
  val CORE_CONTROL = "action:core-control"

  val NEIGHBOR_DISCONNECT = "action:neighbor:disconnect"

  implicit val reads: Reads[StarfishMethod] = Json.reads[StarfishMethod]
  implicit val writes: Writes[StarfishMethod] = Json.writes[StarfishMethod]

  def broadcast(): StarfishMethod = StarfishMethod(BROADCAST)

  def save(location: String): StarfishMethod = {
    require(location != null, "[location] cannot be null")
    StarfishMethod(SAVE_DATA, Json.toJson(location))
  }

  def load(location: String): StarfishMethod = {
    require(location != null, "[location] cannot be null")
    StarfishMethod(LOAD_DATA, Json.toJson(location))
  }

  def deleteClientData(clientId: String): StarfishMethod = {
    require(clientId != null, "[clientId] cannot be null")
    StarfishMethod(DELETE_CLIENT_DATA, Json.toJson(clientId))
  }

  def serverPing(clientId: String): StarfishMethod = {
    require(clientId != null, "[clientId] cannot be null")
    StarfishMethod(SERVER_PING, Json.toJson(clientId))
  }

  def clientPong(ping: StarfishMessage, role: String): StarfishMethod = {
    require(ping != null, "[ping] cannot be null")
    require(role != null, "[role] cannot be null")
    StarfishMethod(CLIENT_PONG, Json.obj(
      "ping" -> ping,
      "role" -> role
    ))
  }

}

