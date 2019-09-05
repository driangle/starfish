package org.driangle.starfish.common.message

//import org.driangle.sandbox.starfish.common.Types.StarfishMessageHandler

trait StarfishMessageHandler extends Function[StarfishMessage, Unit]

object StarfishMessageHandler {
  def group(handlers : StarfishMessageHandler*) : StarfishMessageHandler = {
    GroupStarfishMessageHandler(handlers)
  }

//  def lazyChain() : LazyChain.build()
}
