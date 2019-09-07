package org.driangle.starfish.common.message

object ClientPong {
  def apply(ping: StarfishMessage, role: String): StarfishMessage = {
    val headers = new StarfishHeaders.Builder()
      .withMethod(StarfishMethod.clientPong(ping, role))
      .build()
    StarfishMessage(headers)
  }
}