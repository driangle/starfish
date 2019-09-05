package org.driangle.starfish.common.message

import io.circe.Json

case class StarfishMessage(headers: StarfishHeaders, body : Json = Json.Null)
