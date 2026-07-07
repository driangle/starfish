
class StarfishServerProtocolHandler {

    constructor(server) {
        this._server = server;
    }
    handleConnectionOpen(connection) {
        const timestamp = new Date().getTime();
        connection.id = this._server._connectionsCount + "";
        console.log("Received connection request, connection.id : [" + connection.id + "]");
        this._server.addConnection(timestamp, connection);
        // Ping
        connection.sendUTF(JSON.stringify({
            "headers": {
                "clientId": "starfish-server",
                "method": "sfp:server-ping",
                "timestamp": timestamp
            },
            "body": {
                "count": 1,
                "clientId": connection.id
            }
        }));
    }
    handleMessage(connection, message, server) {
        if (message.asJson.headers.method === "sfp:client-pong") {
            server.setConnectionRole(connection.id, message.asJson.body.role);
        }
    }
}


module.exports = StarfishServerProtocolHandler;