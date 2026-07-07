package org.driangle.starfish.common

import org.driangle.starfish.common.message.{StarfishMessage, StarfishMessageHandler, StarfishMethod}
import play.api.libs.json.JsString

trait StarfishClient {

  def connect() : Unit

  def onConnectionOpen(callback : Function[Unit, Unit]): Unit

  def onMessage(callback : StarfishMessageHandler) : Unit

  def onMethod(method: String, callback: (StarfishMessage, StarfishMethod) => Unit): Unit = {
    this.onMessage(MethodHandler(method, callback))
  }

  def onLoad(location: String, callback: StarfishMessageHandler): Unit = {
    this.onMessage(MethodHandler(StarfishMethod.LOAD_DATA, (message, _) => callback.apply(message)))
  }

  def onDeleteClientData(callback: String => Unit): Unit = {
    this.onMessage(MethodHandler(StarfishMethod.DELETE_CLIENT_DATA, (_, method) => {
      callback.apply(method.arguments.as[JsString].value)
    }))
  }

  def publish(message : StarfishMessage) : Unit

  def publish(messages : Seq[StarfishMessage]) : Unit

  def subscribe(topic : String) : Unit

  def subscribe(topics : Seq[String]) : Unit

  def clientId() : Option[String]


}

case class MethodHandler(methodName: String, callback: (StarfishMessage, StarfishMethod) => Unit) extends StarfishMessageHandler {
  override def apply(message: StarfishMessage): Unit = {
    message.getMethod(methodName).foreach(method => {
      callback.apply(message, method)
    })
  }
}