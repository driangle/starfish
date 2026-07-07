package org.driangle.starfish.common.message


trait StarfishMessageHandler extends Function[StarfishMessage, Unit]

object StarfishMessageHandler {
  def group(handlers : StarfishMessageHandler*) : StarfishMessageHandler = {
    GroupStarfishMessageHandler(handlers)
  }
}
