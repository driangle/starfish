package org.driangle.starfish.common.message

import play.api.libs.json.{JsNull, JsValue, Json, Reads, Writes}

case class StarfishMessage(headers: StarfishHeaders, body : JsValue = JsNull)

object StarfishMessage {
  implicit val decodeMessage : Reads[StarfishMessage] = Json.reads[StarfishMessage]
  implicit val encodeMessage : Writes[StarfishMessage] = Json.writes[StarfishMessage]

}
