package org.driangle.starfish.common.message

import java.util.Date

import play.api.libs.json.{Json, Reads, Writes}

case class StarfishHeaders(methods: Seq[StarfishMethod], timestamp: Long, clientId: Option[String])

object StarfishHeaders {

  implicit val decodeHeaders: Reads[StarfishHeaders] = Json.reads[StarfishHeaders]
  implicit val encodeHeaders: Writes[StarfishHeaders] = Json.writes[StarfishHeaders]

  class Builder {
    private var methods: Seq[StarfishMethod] = List.empty
    private var timestamp: Option[Long] = None
    private var clientId: Option[String] = None

    def withMethod(method : String) : Builder = {
      this.withMethod(StarfishMethod(method))
    }

    def withMethod(method: StarfishMethod): Builder = {
      require(method != null, "[method] cannot be null")
      methods = methods :+ method
      this
    }

    def withTimestamp(_timestamp: Long): Builder = {
      timestamp = Some(_timestamp)
      this
    }

    def withClientId(_clientId: String): Builder = {
      clientId = Option(_clientId)
      this
    }

    def build(): StarfishHeaders = {
      require(methods.nonEmpty, "You must set at least one [method] before calling build()")
      StarfishHeaders(
        methods,
        timestamp.getOrElse(new Date().getTime),
        clientId
      )
    }
  }

}