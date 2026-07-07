package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/driangle/starfish/servers/golang/starfish"
)

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	flag.Parse()

	config := starfish.DefaultConfig()
	config.Addr = *addr

	hub := starfish.NewHub(config)
	hub.StartHeartbeatChecker()

	http.Handle("/starfish", hub)

	log.Printf("Starfish server listening on %s", config.Addr)
	if err := http.ListenAndServe(config.Addr, nil); err != nil {
		log.Fatal(err)
	}
}
