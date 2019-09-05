package org.driangle.starfish.client

import java.util.Date

import org.driangle.starfish.common.message.{ClientPong, StarfishMessage, StarfishMessageHandler}
import org.driangle.starfish.common.{StarfishClient, StarfishMethods}

class StarfishClientProtocolMessageHandler(client: StarfishClient, clientRole: String = "user") extends StarfishMessageHandler {
  override def apply(message: StarfishMessage): Unit = {
    message match {
      case ping: StarfishMessage if ping.headers.method == StarfishMethods.SERVER_PING => {
        client.publish(ClientPong(now(), ping, clientRole))
      }
      case _ => // nothing to do for non-protocol messages
    }
  }

  def now(): Long = new Date().getTime
}
