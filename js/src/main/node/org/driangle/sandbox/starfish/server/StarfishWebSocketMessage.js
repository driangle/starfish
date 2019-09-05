
class StarfishWebSocketMessage {
    constructor(webSocketMessage) {
        this.asString = JSON.stringify(webSocketMessage);
        if (webSocketMessage.type === 'utf8') {
            this.asJson = JSON.parse(webSocketMessage.utf8Data);
        }
    }
}

module.exports = StarfishWebSocketMessage;