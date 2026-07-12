import pytest

from starfish.limits import (
    MAX_PRESENCE_SIZE,
    MAX_TOPIC_NAME_LENGTH,
    validate_payload_size,
    validate_topic_name,
)


class TestValidatePayloadSize:
    def test_accepts_payloads_within_limit(self):
        validate_payload_size('{"x":1}', MAX_PRESENCE_SIZE, "Test")

    def test_rejects_payloads_exceeding_limit(self):
        large = "x" * (MAX_PRESENCE_SIZE + 1)
        with pytest.raises(ValueError, match="exceeds size limit"):
            validate_payload_size(large, MAX_PRESENCE_SIZE, "Presence payload")

    def test_counts_multibyte_utf8_correctly(self):
        # Each emoji is 4 bytes in UTF-8
        emoji = "\U0001f600"
        assert len(emoji.encode("utf-8")) == 4
        # 2 emojis = 8 bytes, should fail with limit of 4
        with pytest.raises(ValueError, match="exceeds size limit"):
            validate_payload_size(emoji * 2, 4, "Test")


class TestValidateTopicName:
    def test_accepts_valid_topic_names(self):
        validate_topic_name("lights")
        validate_topic_name("a" * 128)

    def test_rejects_topic_names_exceeding_max_length(self):
        with pytest.raises(ValueError, match=f"exceeds {MAX_TOPIC_NAME_LENGTH} characters"):
            validate_topic_name("a" * 129)
