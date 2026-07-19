from __future__ import annotations

import argparse
import asyncio

from .config import StarfishConfig
from .server import StarfishServer


def main() -> None:
    parser = argparse.ArgumentParser(description="Starfish Protocol Server")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--heartbeat-interval", type=int, default=15000, help="Heartbeat interval in ms")
    parser.add_argument("--heartbeat-timeout", type=int, default=30000, help="Heartbeat timeout in ms")
    parser.add_argument("--resume-timeout", type=int, default=30000, help="Resume timeout in ms")
    args = parser.parse_args()

    config = StarfishConfig(
        port=args.port,
        heartbeat_interval_ms=args.heartbeat_interval,
        heartbeat_timeout_ms=args.heartbeat_timeout,
        resume_timeout_ms=args.resume_timeout,
    )

    server = StarfishServer(config)
    try:
        asyncio.run(server.serve_forever())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
