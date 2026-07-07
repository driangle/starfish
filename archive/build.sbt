import sbtcrossproject.CrossPlugin.autoImport.{crossProject, CrossType}

lazy val starfish = crossProject(JVMPlatform, JSPlatform)
  .crossType(CrossType.Full)
  .withoutSuffixFor(JVMPlatform)
  .in(file("."))
  .settings(
    organization := "org.driangle",
    name := "starfish",
    version := "0.1.0-SNAPSHOT",
    scalaVersion := "2.12.6",
    libraryDependencies ++= Seq(
      "org.scalatest" %% "scalatest" % "3.0.8" % "test",
//      "org.driangle" %% "flunc" % "0.2.0-SNAPSHOT"
    )
  )
  .jvmSettings(
    libraryDependencies ++= Seq(
      "javax.websocket" % "javax.websocket-api" % "1.1",
      "org.eclipse.jetty.websocket" % "javax-websocket-client-impl" % "9.4.14.v20181114",
      "com.typesafe.play" %% "play-json" % "2.7.3",
//      "io.circe" %% "circe-core" % "0.11.1",
//      "io.circe" %% "circe-generic" % "0.11.1",
//      "io.circe" %% "circe-parser" % "0.11.1",
      "org.scalatest" %% "scalatest" % "3.0.8" % "test"
    ),
    resolvers ++= Seq(
      Resolver.sonatypeRepo("public")
    )
  )
  .jsSettings(
    libraryDependencies ++= Seq(
      "org.scala-js" %%% "scalajs-dom" % "0.9.7",
      "com.typesafe.play" %%% "play-json" % "2.7.3"
//      "io.circe" %%% "circe-core" % "0.11.1",
//      "io.circe" %%% "circe-generic" % "0.11.1",
//      "io.circe" %%% "circe-parser" % "0.11.1"
    ),
    scalacOptions += "-P:scalajs:sjsDefinedByDefault"
  )