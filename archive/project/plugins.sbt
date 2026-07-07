// Enables code coverage reports
addSbtPlugin("com.github.sbt" % "sbt-jacoco" % "3.0.3")

// Enables ScalaJS build
//addSbtPlugin("org.scala-js" % "sbt-scalajs" % "0.6.28")

// Enables Cross Compiling
addSbtPlugin("org.portable-scala" % "sbt-scalajs-crossproject"      % "0.6.1")
//addSbtPlugin("org.portable-scala" % "sbt-scala-native-crossproject" % "0.6.1")
addSbtPlugin("org.scala-js"       % "sbt-scalajs"                   % "0.6.28")
//addSbtPlugin("org.scala-js"       % "sbt-scalajs"                   % "1.0.0-M8")


//addSbtPlugin("org.scala-native"   % "sbt-scala-native"              % "0.3.7")