package org.driangle.starfish.common.message

case class GroupStarfishMessageHandler(children: Seq[StarfishMessageHandler]) extends StarfishMessageHandler {
  override def apply(message: StarfishMessage): Unit = {
    children.foreach(_.apply(message))
  }
}
