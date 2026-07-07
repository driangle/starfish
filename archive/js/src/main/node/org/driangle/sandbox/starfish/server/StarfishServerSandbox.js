const StarfishServer = require("./StarfishServer.js");

class SpiderWebsStarfishHandler {

    handleMessage(connection, message, server) {
        const starfishMessage = message.asJson;
        try {
            if (starfishMessage.headers.method === "driangle:webs:set-spider-web-state") {
                server.broadcast(message, other => {
                    return other.id != connection.id;
                });
            }
        } catch (e) {
            console.error("Exception [" + e + "] while processing message [" + message.asString + "]");
        }
    }

}

new StarfishServer(
    [new SpiderWebsStarfishHandler()]
).start(5742);