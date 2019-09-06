package org.driangle.starfish.common.message

import org.driangle.starfish.common.{ClientId, StarfishMethods}
import play.api.libs.json.Json

object ServerPing {

  def apply(id : String) : StarfishMessage = {
    StarfishMessage(
      headers = new StarfishHeaders.Builder()
        .withClientId(ClientId.SERVER)
        .withMethod(StarfishMethods.SERVER_PING)
        .build(),
      body = Json.obj("clientId" -> id)
    )
  }

}
