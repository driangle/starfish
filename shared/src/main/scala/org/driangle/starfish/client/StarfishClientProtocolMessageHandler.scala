package org.driangle.starfish.client

import org.driangle.starfish.common.StarfishClient
import org.driangle.starfish.common.message.{ClientPong, StarfishMessage, StarfishMessageHandler, StarfishMethod}

class StarfishClientProtocolMessageHandler(client: StarfishClient, clientRole: String = "user") extends StarfishMessageHandler {
  private var _clientId : Option[String] = None
  override def apply(message: StarfishMessage): Unit = {
    message.getMethod(StarfishMethod.SERVER_PING).foreach(method => {
      _clientId = Some(method.arguments.as[String])
      client.publish(ClientPong(message, clientRole))
    })
  }

  def sign(message: StarfishMessage) : StarfishMessage = {
    _clientId.map(id => message.withClientId(id)).getOrElse(message)
  }

  def isReadyToSendMessage() : Boolean = _clientId.nonEmpty

  def clientId() : Option[String] = _clientId
}
