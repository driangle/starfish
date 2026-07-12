MAX_WS_MESSAGE_SIZE = 64 * 1024
MAX_RTC_CONTROL_SIZE = 64 * 1024
MAX_RTC_STREAM_SIZE = 16 * 1024
MAX_PRESENCE_SIZE = 8 * 1024
MAX_DATA_VALUE_SIZE = 256 * 1024
MAX_TOPIC_NAME_LENGTH = 128
MAX_CLIENT_META_SIZE = 16 * 1024


def validate_payload_size(json: str, limit: int, label: str) -> None:
    size = len(json.encode("utf-8"))
    if size > limit:
        raise ValueError(f"{label} exceeds size limit: {size} bytes > {limit} bytes")


def validate_topic_name(topic: str) -> None:
    if len(topic) > MAX_TOPIC_NAME_LENGTH:
        raise ValueError(f'Topic name exceeds {MAX_TOPIC_NAME_LENGTH} characters: "{topic}"')
