package org.driangle.starfish.server

import org.driangle.starfish.common.message.StarfishMessage

case class GroupStarfishServerHandler(children : Seq[StarfishServerHandler]) extends StarfishServerHandler {

  override def handleConnectionOpen(connection : StarfishConnection) : Unit = {
    children.foreach(_.handleConnectionOpen(connection))
  }
  override def handleConnectionClose(connection: StarfishConnection) : Unit = {
    children.foreach(_.handleConnectionClose(connection))
  }
  override def handleMessage(connection : StarfishConnection, message : StarfishMessage) : Unit = {
    children.foreach(_.handleMessage(connection, message))
  }
}

