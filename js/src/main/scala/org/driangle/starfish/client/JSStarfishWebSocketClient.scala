package org.driangle.starfish.client

import org.driangle.starfish.common.StarfishClient
import org.driangle.starfish.common.message.{PlayJsonStarfishMessageCodec, StarfishMessage, StarfishMessageCodec, StarfishMessageHandler}
import org.scalajs.dom.raw.WebSocket
import play.api.libs.json.Json

import scala.scalajs.js.annotation.JSExport

class JSStarfishWebSocketClient(endpointURI: String,
                                codec : StarfishMessageCodec = new PlayJsonStarfishMessageCodec) extends StarfishClient {

  var ws: WebSocket = null
  var handlers: Seq[StarfishMessageHandler] = List.empty
  var messageQueueWaitingForConnection: Seq[StarfishMessage] = List.empty
  val messageHandler = StarfishMessageHandler.group(
    new StarfishClientProtocolMessageHandler(this),
    message => handlers.foreach(_.apply(message))
  )

  @JSExport("connect")
  override def connect(): Unit = {
    if (ws == null) {
      ws = new WebSocket(endpointURI)
      ws.onmessage = wsEvent => {
        val message = Json.parse(wsEvent.data.toString).as[StarfishMessage]
        messageHandler.apply(message)
      }
      ws.onopen = _ => {
        if (messageQueueWaitingForConnection.nonEmpty && ws.readyState == WebSocket.OPEN) {
          this.publish(messageQueueWaitingForConnection)
          messageQueueWaitingForConnection = List.empty
        }
      }
    }
  }

  @JSExport("onMessage")
  override def onMessage(handler: StarfishMessageHandler): Unit = {
    handlers = handlers :+ handler
  }

  @JSExport("publish")
  override def publish(message: StarfishMessage): Unit = {
    codec.serialize(message) match {
      case Some(serialized) if isWebSocketReady() => ws.send(serialized)
      case Some(_) => pushMessageToLazyQueue(message)
      case None => println(s"Unable to serialize message [${message}]")
    }
  }

  @JSExport("publish")
  override def publish(messages: Seq[StarfishMessage]): Unit = {
    messages.foreach(this.publish _)
  }

  @JSExport("subscribe")
  override def subscribe(topic: String): Unit = ???

  @JSExport("subscribe")
  override def subscribe(topics: Seq[String]): Unit = ???

  @JSExport("onConnectionOpen")
  override def onConnectionOpen(callback: Function[Unit, Unit]): Unit = ???

  private def isWebSocketReady() : Boolean = {
    Option(ws).map(_.readyState == WebSocket.OPEN).getOrElse(false)
  }

  private def pushMessageToLazyQueue(message: StarfishMessage): Unit = {
    messageQueueWaitingForConnection = messageQueueWaitingForConnection :+ message
  }

}
