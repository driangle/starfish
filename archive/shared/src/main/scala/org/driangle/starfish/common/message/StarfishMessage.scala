package org.driangle.starfish.common.message

import play.api.libs.json.{JsNull, JsValue, Json, Reads, Writes}

case class StarfishMessage(headers: StarfishHeaders, body : JsValue = JsNull) {
  def withClientId(id: String): StarfishMessage = {
    copy(headers = headers.copy(clientId = Some(id)))
  }

  def getMethod(name : String) : Option[StarfishMethod] = headers.methods.find(_.name == name)

  def hasMethod(name : String) : Boolean = getMethod(name).nonEmpty
}

object StarfishMessage {
  implicit val decodeMessage : Reads[StarfishMessage] = Json.reads[StarfishMessage]
  implicit val encodeMessage : Writes[StarfishMessage] = Json.writes[StarfishMessage]
}
