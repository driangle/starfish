package org.driangle.starfish.client

import java.net.URI

import org.driangle.starfish.common.StarfishClient
import org.driangle.starfish.common.message.{PlayJsonStarfishMessageCodec, StarfishMessage, StarfishMessageCodec, StarfishMessageHandler}

class StarfishJavaxNetWebSocketClient(endpointURI : String,
                                      role : String,
                                      codec : StarfishMessageCodec = new PlayJsonStarfishMessageCodec()) extends StarfishClient {
  var handlers : Seq[StarfishMessageHandler] = List.empty
  val endpoint = new StarfishJavaxNetWebSocketEndpoint(
    new URI(endpointURI),
    codec,
    StarfishMessageHandler.group(
      new StarfishClientProtocolMessageHandler(this, role),
      message => handlers.foreach(_.apply(message))
    )
  )

  override def publish(message: StarfishMessage): Unit = {
    codec.serialize(message) match {
      case Some(serializedMessage) => endpoint.publish(serializedMessage)
      case None => throw new RuntimeException(s"Unable to serialize message [${message}], no eligible serializer")
    }
  }

  override def publish(messages: Seq[StarfishMessage]): Unit = {
    messages.foreach(this.publish _)
  }

  override def subscribe(topic: String): Unit = ???

  override def subscribe(topics: Seq[String]): Unit = ???

  override def onConnectionOpen(callback: Function[Unit, Unit]): Unit = ???

  override def connect(): Unit = {
    endpoint.connect()
  }

  override def onMessage(handler: StarfishMessageHandler): Unit = {
    handlers = handlers :+ handler
  }
}
