from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .client import Client, ClientInfo
from .data_store import DataStore
from .presence import PresenceThrottle
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


class Session:
    def __init__(self, name: str, hub: StarfishServer) -> None:
        self.name = name
        self.data = DataStore()
        self._clients: dict[str, Client] = {}
        self._topics: dict[str, dict[str, Client]] = {}
        self._presence = PresenceThrottle(self, hub)
        self._presence.start()
        self._presence_data: dict[str, Any] = {}

    def add_client(self, client: Client) -> list[dict[str, Any]]:
        self._clients[client.id] = client
        return [c.info().to_dict() for c in self._clients.values()]

    def remove_client(self, client_id: str) -> bool:
        self._clients.pop(client_id, None)
        self._presence_data.pop(client_id, None)

        empty_topics: list[str] = []
        for topic, subs in self._topics.items():
            subs.pop(client_id, None)
            if not subs:
                empty_topics.append(topic)
        for topic in empty_topics:
            del self._topics[topic]

        return len(self._clients) == 0

    def get_client(self, client_id: str) -> Client | None:
        return self._clients.get(client_id)

    def has_client(self, client_id: str) -> bool:
        return client_id in self._clients

    def broadcast(self, frame: StarfishFrame, exclude_id: str | None = None) -> None:
        for cid, client in self._clients.items():
            if cid != exclude_id:
                client.send_frame(frame)

    def subscribe(self, topic: str, client: Client) -> None:
        if topic not in self._topics:
            self._topics[topic] = {}
        self._topics[topic][client.id] = client

    def unsubscribe(self, topic: str, client_id: str) -> None:
        subs = self._topics.get(topic)
        if subs is None:
            return
        subs.pop(client_id, None)
        if not subs:
            del self._topics[topic]

    def is_subscribed(self, topic: str, client_id: str) -> bool:
        subs = self._topics.get(topic)
        return subs is not None and client_id in subs

    def get_subscribers(self, topic: str) -> list[Client]:
        subs = self._topics.get(topic)
        if subs is None:
            return []
        return list(subs.values())

    def get_topic_subscriber_ids(self, topic: str) -> list[str]:
        subs = self._topics.get(topic)
        if subs is None:
            return []
        return list(subs.keys())

    def set_presence(self, client_id: str, payload: Any) -> None:
        self._presence_data[client_id] = payload
        self._presence.set(client_id, payload)

    def get_presence(self, client_id: str) -> Any:
        return self._presence_data.get(client_id)

    def destroy(self) -> None:
        self._presence.stop()
