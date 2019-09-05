package org.driangle.starfish.common.message

import io.circe.Json
import org.driangle.starfish.common.StarfishHeaders

case class StarfishMessage(headers: StarfishHeaders, body : Json = Json.Null)
