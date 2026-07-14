// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "StarfishClient",
    platforms: [
        .iOS(.v16),
        .macOS(.v13),
        .tvOS(.v16),
        .watchOS(.v9),
    ],
    products: [
        .library(name: "StarfishClient", targets: ["StarfishClient"]),
    ],
    targets: [
        .target(
            name: "StarfishClient",
            path: "Sources/StarfishClient"
        ),
        .testTarget(
            name: "StarfishClientTests",
            dependencies: ["StarfishClient"],
            path: "Tests/StarfishClientTests"
        ),
    ]
)
