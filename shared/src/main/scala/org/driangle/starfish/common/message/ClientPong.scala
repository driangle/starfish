package org.driangle.starfish.common.message

import org.driangle.starfish.common.StarfishMethods
import play.api.libs.json.Json

object ClientPong {
  def apply(timestamp: Long, ping: StarfishMessage, role: String): StarfishMessage = {
    val headers = new StarfishHeaders.Builder()
      .withMethod(StarfishMethods.CLIENT_PONG)
      .withTimestamp(timestamp)
      .build()
    val body = Json.obj(
      "ping" -> ping,
      "role" -> role
    )
    StarfishMessage(headers, body)
  }
}