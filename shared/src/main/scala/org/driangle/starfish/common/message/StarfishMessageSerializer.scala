package org.driangle.starfish.common.message

trait StarfishMessageSerializer {
  def serialize(message : StarfishMessage) : Option[String]
}
