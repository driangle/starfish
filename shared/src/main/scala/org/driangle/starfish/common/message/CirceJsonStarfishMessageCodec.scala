package org.driangle.starfish.common.message

import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._

class CirceJsonStarfishMessageCodec extends StarfishMessageCodec {
  override def serialize(message: StarfishMessage): Option[String] = {
    Some(message.asJson.noSpaces)
  }

  override def deserialize(rawMessage: String): Option[StarfishMessage] = {
    parse(rawMessage) match {
      case Left(error) => {
        println(s"Error while parsing rawMessage [${rawMessage}]")
        error.printStackTrace()
        None
      }
      case Right(json) => json.as[StarfishMessage] match {
        case Left(error) => {
          println(s"Unable to deserialize rawMessage into starfishMessage [${rawMessage}]")
          error.printStackTrace()
          None
        }
        case Right(message) => Some(message)
      }
    }
  }
}
