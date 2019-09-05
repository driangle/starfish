package org.driangle.starfish.client

object StarfishClientSandbox extends App {

  val client = new StarfishWebSocketClient(
    endpointURI = "ws://localhost:5742",
    "user"
  )

  client.connect()

}
