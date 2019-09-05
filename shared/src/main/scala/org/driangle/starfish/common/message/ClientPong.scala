package org.driangle.starfish.common.message

import io.circe.Json
import io.circe.generic.auto._
import io.circe.syntax._
import org.driangle.starfish.common.{StarfishMethods, message}

object ClientPong {
  def apply(timestamp: Long, ping: StarfishMessage, role: String): StarfishMessage = {
    val headers = new StarfishHeaders.Builder()
      .withMethod(StarfishMethods.CLIENT_PONG)
      .withTimestamp(timestamp)
      .build()
    val body = Json.obj(
      "ping" -> ping.asJson,
      "role" -> role.asJson
    )
    message.StarfishMessage(headers, body)
  }
}