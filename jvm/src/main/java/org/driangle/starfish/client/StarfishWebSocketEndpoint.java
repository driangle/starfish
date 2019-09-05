package org.driangle.starfish.client;

import org.driangle.starfish.common.message.StarfishMessage;
import org.driangle.starfish.common.message.StarfishMessageDeserializer;
import org.driangle.starfish.common.message.StarfishMessageHandler;
import scala.Option;

import javax.websocket.*;
import java.net.URI;

@ClientEndpoint
public class StarfishWebSocketEndpoint {

    private Session userSession = null;
    private final URI endpointURI;
    private final StarfishMessageDeserializer deserializer;
    private final StarfishMessageHandler messageHandler;

    public StarfishWebSocketEndpoint(URI endpointURI,
                                     StarfishMessageDeserializer deserializer,
                                     StarfishMessageHandler messageHandler) {
        if (endpointURI == null) {
            throw new IllegalArgumentException("[endpointURI] cannot be null");
        }
        if (deserializer == null) {
            throw new IllegalArgumentException("[deserializer] cannot be null");
        }
        if (messageHandler == null) {
            throw new IllegalArgumentException("[messageHandler] cannot be null");
        }

        this.endpointURI = endpointURI;
        this.deserializer = deserializer;
        this.messageHandler = messageHandler;
    }

    /**
     * Callback hook for Connection open events.
     *
     * @param userSession the userSession which is opened.
     */
    @OnOpen
    public void onOpen(Session userSession) {
        this.userSession = userSession;
//        this.connectionStateListener.onConnectionOpened();
    }

    /**
     * Callback hook for Message Events. This method will be invoked when a
     * client send a message.
     *
     * @param rawMessage The text message
     */
    @OnMessage
    public void onMessage(String rawMessage) {
        System.out.println("Deserializing: " + rawMessage);
        final Option<StarfishMessage> message = deserializer.deserialize(rawMessage);

        if (message.isDefined()) {
            System.out.println("Successfully deserialized: " + message.get());
            this.messageHandler.apply(message.get());
        } else {
            System.out.println("Message [" + rawMessage + "] was not serialized");
        }
    }

    @OnError
    public void onError(Throwable e) {
        e.printStackTrace();
    }

    /*
     * Send a message.
     * @param message the message to send
     */
    public void publish(String message) {
        System.out.println("Sending message: " + message);
        this.userSession.getAsyncRemote().sendText(message);
    }

    public void connect() {
        try {
            final WebSocketContainer container = ContainerProvider.getWebSocketContainer();
            container.connectToServer(this, endpointURI);
        } catch (Exception e) {
            throw new RuntimeException(String.format("Unable to connect to server @ [%s]", endpointURI));
        }
    }

    interface ConnectionStateListener {
        default void onConnectionOpened() {
        }

        default void onConnectionClosed() {
        }
    }
}
