package org.driangle.starfish.common

import org.driangle.starfish.common.message.{StarfishMessage, StarfishMessageHandler}

trait StarfishClient {

  def connect() : Unit

  def onConnectionOpen(callback : Function[Unit, Unit]): Unit

  def onMessage(callback : StarfishMessageHandler) : Unit

  def publish(message : StarfishMessage) : Unit

  def publish(messages : Seq[StarfishMessage]) : Unit

  def subscribe(topic : String) : Unit

  def subscribe(topics : Seq[String]) : Unit


}
