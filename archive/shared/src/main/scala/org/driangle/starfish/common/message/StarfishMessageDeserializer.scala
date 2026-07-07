package org.driangle.starfish.common.message

trait StarfishMessageDeserializer {

  def deserialize(rawMessage : String) : Option[StarfishMessage]

}
