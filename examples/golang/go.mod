module github.com/driangle/starfish/examples/golang

go 1.26.1

require github.com/driangle/starfish/sdks/golang v0.0.0

require nhooyr.io/websocket v1.8.17 // indirect

// The SDK is not published yet, so build against the copy in this repo.
replace github.com/driangle/starfish/sdks/golang => ../../sdks/golang
