package org.driangle.starfish.common.message

import org.driangle.starfish.common.StarfishMethods
import play.api.libs.json.Json

object CorePong {

  def apply(timestamp: Long, ping: StarfishMessage): StarfishMessage = {
    val headers: StarfishHeaders = new StarfishHeaders.Builder()
      .withMethod(StarfishMethods.CORE_PONG)
      .withTimestamp(timestamp)
      .build()

    val body = Json.obj("ping" -> ping)
    StarfishMessage(headers, body)
  }
}
