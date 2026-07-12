"""Shared fixtures for Python SDK integration tests."""

from __future__ import annotations

import asyncio
import os
import random
import time

import pytest

from starfish import (
    AuthOptions,
    ClientIdentity,
    ReconnectOptions,
    StarfishClient,
    StarfishClientOptions,
)

SERVER_URL = os.environ.get("STARFISH_SERVER_URL", "ws://localhost:8080/starfish")

_counter = 0
_worker_id = f"{random.randint(0, 999999):06x}"


def unique_session() -> str:
    global _counter
    _counter += 1
    return f"py-sdk-test-{_worker_id}-{int(time.time() * 1000)}-{_counter}"


def create_client(name: str = "sdk-test") -> StarfishClient:
    return StarfishClient(
        StarfishClientOptions(
            server=SERVER_URL,
            client=ClientIdentity(name=name, role="test"),
            auth=AuthOptions(type="none"),
            reconnect=ReconnectOptions(enabled=False),
        )
    )


@pytest.fixture
def session_id():
    return unique_session()


@pytest.fixture
async def clients():
    """Track clients for automatic cleanup."""
    tracked: list[StarfishClient] = []

    yield tracked

    await asyncio.gather(*[c.disconnect() for c in tracked], return_exceptions=True)
