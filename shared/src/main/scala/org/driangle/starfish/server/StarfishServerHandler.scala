package org.driangle.starfish.server

import org.driangle.starfish.common.message.StarfishMessage

trait StarfishServerHandler {

  def handleConnectionOpen(connection: StarfishConnection): Unit = {}

  def handleConnectionClose(connection: StarfishConnection): Unit = {}

  def handleMessage(connection: StarfishConnection, message: StarfishMessage): Unit = {}

}

object StarfishServerHandler {
  def group(children: StarfishServerHandler*): StarfishServerHandler = {
    GroupStarfishServerHandler(children)
  }
}