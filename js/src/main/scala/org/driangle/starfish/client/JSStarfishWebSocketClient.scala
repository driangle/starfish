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
  var messagesWaitingToBePublished: Seq[StarfishMessage] = List.empty
  val protocol = new StarfishClientProtocolMessageHandler(this)
  val messageHandler = StarfishMessageHandler.group(
    protocol,
    message => handlers.foreach(_.apply(message)),
    _ => {
      if (messagesWaitingToBePublished.nonEmpty && isReadyToPublish()) {
        publishMessagesWaitingToBePublished()
      }
    }
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
        if (messagesWaitingToBePublished.nonEmpty && isReadyToPublish()) {
          publishMessagesWaitingToBePublished()
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
    val signed = protocol.sign(message)
    codec.serialize(signed) match {
      case Some(serialized) if isReadyToPublish() => ws.send(serialized)
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

  override def clientId(): Option[String] = protocol.clientId()

  private def isReadyToPublish() : Boolean = {
    val isWebSocketReady = Option(ws).map(_.readyState == WebSocket.OPEN).getOrElse(false)
    val isProtocolReady = protocol.isReadyToSendMessage()
    isWebSocketReady && isProtocolReady
  }

  private def pushMessageToLazyQueue(message: StarfishMessage): Unit = {
    messagesWaitingToBePublished = messagesWaitingToBePublished :+ message
  }

  private def publishMessagesWaitingToBePublished() = {
    this.publish(messagesWaitingToBePublished)
    messagesWaitingToBePublished = List.empty
  }

}
