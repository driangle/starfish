package org.driangle.starfish.common.message

import java.util.Date

case class StarfishHeaders(method : String, timestamp : Long, clientId : Option[String])

object StarfishHeaders {

  class Builder {
    private var method : Option[String] = None
    private var timestamp : Option[Long] = None
    private var clientId : Option[String] = None

    def withMethod(_method : String) : Builder = {
      require(_method != null, "[method] cannot be null")
      method = Some(_method)
      this
    }

    def withTimestamp(_timestamp : Long) : Builder = {
      timestamp = Some(_timestamp)
      this
    }

    def withClientId(_clientId : String) : Builder = {
      clientId = Option(_clientId)
      this
    }

    def build() : StarfishHeaders = {
      require(method.nonEmpty, "You must set [method] before calling build()")
      StarfishHeaders(
        method.get,
        timestamp.getOrElse(new Date().getTime),
        clientId
      )
    }
  }
}