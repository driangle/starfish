package org.driangle.starfish.common.message

import io.circe.Json
import org.driangle.starfish.common.message
import org.scalatest.FunSuite

class CirceJsonStarfishMessageCodecSpec extends FunSuite {

  val codec = new CirceJsonStarfishMessageCodec()

  test("[deserialize] should be able to deserialize a basic message with no body") {
    val messageJson = "{\"headers\":{\"clientId\":\"starfish-server\",\"method\":\"sfp:server-ping\",\"timestamp\":1567685139437},\"body\":null}"
    val result = codec.deserialize(messageJson)
    val expected = StarfishMessage(new message.StarfishHeaders.Builder()
      .withClientId("starfish-server")
      .withMethod("sfp:server-ping")
      .withTimestamp(1567685139437L)
      .build(),
      Json.Null
    )
    assert(result.nonEmpty)
    assertResult(expected)(result.get)
  }

  test("[deserialize] should be able to deserialize a basic message with a body") {
    val messageJson = "{\"headers\":{\"clientId\":\"starfish-server\",\"method\":\"sfp:server-ping\",\"timestamp\":1567685139437},\"body\":{\"hello\":\"world\"}}"
    val result = codec.deserialize(messageJson)
    val expected = StarfishMessage(new message.StarfishHeaders.Builder()
      .withClientId("starfish-server")
      .withMethod("sfp:server-ping")
      .withTimestamp(1567685139437L)
      .build(),
      Json.obj("hello" -> Json.fromString("world"))
    )
    assert(result.nonEmpty)
    assertResult(expected)(result.get)
  }

}
