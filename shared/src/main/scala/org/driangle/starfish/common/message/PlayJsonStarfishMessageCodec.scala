package org.driangle.starfish.common.message

import play.api.libs.json.Json

class PlayJsonStarfishMessageCodec extends StarfishMessageCodec {
  override def serialize(message: StarfishMessage): Option[String] = {
    Some(Json.stringify(Json.toJson(message)))
  }

  override def deserialize(rawMessage: String): Option[StarfishMessage] = {
    Some(Json.parse(rawMessage).as[StarfishMessage])
  }
}
