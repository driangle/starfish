package org.driangle.starfish.common.message

import io.circe.Json
import io.circe.generic.auto._
import io.circe.syntax._
import org.driangle.starfish.common.{StarfishHeaders, StarfishMethods, message}

object CorePong {

  def apply(timestamp: Long, ping: StarfishMessage): StarfishMessage = {
    val headers: StarfishHeaders = new StarfishHeaders.Builder()
      .withMethod(StarfishMethods.CORE_PONG)
      .withTimestamp(timestamp)
      .build()

    val body = Json.obj("ping" -> ping.asJson)
    message.StarfishMessage(headers, body)
  }
}
