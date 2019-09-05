/**
 From Switzerland => us-west-1 => PHX laptop. Same results for Cloudfront vs EC2
 client => server: 130-174
 client => laptop: 200-386

 From NYC => us-west-1 => PHX laptop. Cloudfront was slightly better
 client => server: low 79 cloudfront
 client => laptop: 110 rtt
 */
var CONSTANTS = {
    "MAX_PING_COUNT": 10,
    "ACTION_SERVER_PING": "sfp:server-ping",
    "ACTION_SERVER_PONG": "sfp:server-pong",
    "ACTION_CLIENT_PING": "sfp:client-ping",
    "ACTION_CLIENT_PONG": "sfp:client-pong",
    "ACTION_CORE_PONG": "sfp:core-pong",
    "ACTION_USER_SUBSCRIBE": "action:user-subscribe",
    "ACTION_USER_CONTROL": "action:user-control",
    "ACTION_CORE_CONTROL": "action:core-control",
    "ACTION_LOAD_FROM_MEMORY_REQUEST": "action:load-from-memory:request",
    "ACTION_LOAD_FROM_MEMORY_RESPONSE": "action:load-from-memory:response",
    "ACTION_NEIGHBOR_DISCONNECT": "action:neighbor:disconnect",
    "ROLE_CORE": "role:core"
};
const WebSocketServer = require('websocket').server;
const http = require('http');
const StarfishServerProtocolHandler = require("./StarfishServerProtocolHandler.js");
const StarfishWebSocketMessage = require("./StarfishWebSocketMessage.js");

class StarfishServer {

    constructor(handlers = []) {
        this._protocol = new StarfishServerProtocolHandler(this);
        this._handlers = [this._protocol].concat(handlers);
        this._connectionsCount = 0;
        this._connectionsCache = {};
    }

    start(port) {
        const server = this;
        const httpServer = http.createServer(function (request, response) {
            // process HTTP request. Since we're writing just WebSockets
            // server we don't have to implement anything.
        }).listen(port, function () {
            console.log((new Date()) + " Server is listening on port " + port);
        });

        const wsServer = new WebSocketServer({
            httpServer: httpServer
        });

        function delegateToHandlers(functionName, args) {
            server._handlers.forEach(function (handler) {
                const func = handler[functionName];
                if (typeof func === "function") {
                    func.apply(handler, args);
                }
            });
        }

        wsServer.on('request', function (request) {
            const connection = request.accept(null, request.origin);

            delegateToHandlers('handleConnectionOpen', [connection]);

            connection.on('message', function (webSocketMessage) {
                const message = new StarfishWebSocketMessage(webSocketMessage);
                console.log("Processing message: " + message.asString);
                if (message.asJson) {
                    delegateToHandlers('handleMessage', [connection, message, server]);
                } else {
                    console.log("Unable to parse message asJson [" + message.asString + "]");
                }
            });

            connection.on('close', function () {
                delegateToHandlers('handleConnectionClose', [connection]);
                // delegateToHandlers('handleCoreControlConnectionClose', [connection]);
                // starfish.handleCoreControlConnectionClose(connection);
                console.log("Closed connection [" + connection.id + "], [" + server._connectionsCount + "] connections remaining");
            });
        });
    }

    addConnection(timestamp, connection) {
        this._connectionsCache[connection.id] = {
            "pingTime": timestamp,
            "connection": connection
        }
        this._connectionsCount++;
    }

    setConnectionRole(connectionId, role) {
        this._connectionsCache[connectionId].role = role;
    }

    getConnectionsCount() {
        return this._connectionsCount;
    }

    forEachConnection(callback) {
        for (var id in this._connectionsCache) {
            if (this._connectionsCache.hasOwnProperty(id)) {
                const cache = this._connectionsCache[id];
                callback(cache.connection);
            }
        }
    }

    broadcast(message, connectionFilter) {
        this.forEachConnection(neighbor => {
            if (connectionFilter(neighbor)) {
                neighbor.sendUTF(JSON.stringify(message.asJson));
            }
        });
    }
}

// export default StarfishServer;
module.exports = StarfishServer;