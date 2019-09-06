package org.driangle.starfish

import org.driangle.starfish.client.JSStarfishWebSocketClient
import org.driangle.starfish.common.StarfishClient

import scala.scalajs.js.annotation.{JSExport, JSExportTopLevel}

@JSExportTopLevel("Starfish")
object JSStarfish {

  @JSExport
  def webSocketClient(endpointURI : String) : StarfishClient = {
    new JSStarfishWebSocketClient(endpointURI)
  }

}
