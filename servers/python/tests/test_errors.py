from starfish_server.errors import (
    ERR_AUTH_REQUIRED,
    ERR_DATA_CONFLICT,
    ERR_PROTOCOL_INVALID_FRAME,
    RETRYABLE_CODES,
    create_error_frame,
)
from starfish_server.id import IDGenerator


class TestErrors:
    def test_create_error_frame_basic(self):
        gen = IDGenerator()
        frame = create_error_frame(gen, "msg_1", ERR_AUTH_REQUIRED)
        assert frame["header"]["replyTo"] == "msg_1"
        assert frame["header"]["kind"] == "response"
        assert frame["payload"]["error"]["code"] == ERR_AUTH_REQUIRED
        assert frame["payload"]["error"]["retry"] is False

    def test_create_error_frame_retryable(self):
        gen = IDGenerator()
        frame = create_error_frame(gen, "msg_1", ERR_DATA_CONFLICT)
        assert frame["payload"]["error"]["retry"] is True

    def test_create_error_frame_with_resource_and_method(self):
        gen = IDGenerator()
        frame = create_error_frame(gen, "msg_1", ERR_PROTOCOL_INVALID_FRAME, "topic", "publish")
        assert frame["header"]["resource"] == "topic"
        assert frame["header"]["method"] == "publish"

    def test_create_error_frame_with_details(self):
        gen = IDGenerator()
        frame = create_error_frame(gen, "msg_1", ERR_DATA_CONFLICT, details={"key": "x"})
        assert frame["payload"]["details"] == {"key": "x"}
