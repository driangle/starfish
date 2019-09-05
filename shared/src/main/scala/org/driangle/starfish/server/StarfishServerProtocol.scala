package org.driangle.starfish.server

import org.driangle.starfish.common.message.StarfishMessage

trait StarfishServerProtocol {

  def handleConnectionOpen(connection : StarfishConnection) : Unit
  def handleConnectionClose(connection: StarfishConnection) : Unit
  def handleMessage(message : StarfishMessage) : Unit

}
