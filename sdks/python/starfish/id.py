_counter = 0


def next_id(prefix: str = "msg") -> str:
    global _counter
    _counter += 1
    return f"{prefix}_{_counter}"


def reset_id_counter() -> None:
    global _counter
    _counter = 0
