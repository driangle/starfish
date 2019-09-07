package org.driangle.starfish.common.message

import org.driangle.starfish.common.ClientId

object ServerPing {

  def apply(clientId: String): StarfishMessage = {
    StarfishMessage(
      headers = new StarfishHeaders.Builder()
        .withClientId(ClientId.SERVER)
        .withMethod(StarfishMethod.serverPing(clientId))
        .build()
    )
  }

}
