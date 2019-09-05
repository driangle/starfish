package org.driangle.starfish.server

import org.driangle.starfish.common.message.{StarfishMessage, StarfishMessageHandler}

class StarfishServerProtocolMessageHandler() extends StarfishMessageHandler {
  override def apply(message: StarfishMessage): Unit = ???
}