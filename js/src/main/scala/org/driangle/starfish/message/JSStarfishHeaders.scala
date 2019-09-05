package org.driangle.starfish.server

import scala.scalajs.js

class JSStarfishHeaders extends js.Object {

  var method : String = _
  /**
   * According to @sjrd: you can't use Long for parameters that you intend to pass from JS, because Long is opaque.
   * You have to use Double instead (assuming your values do not exceed 2^53).
   **/
  var timestamp : Double = _
  var clientId : String = _
}
