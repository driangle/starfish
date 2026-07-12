from starfish.id import next_id, reset_id_counter


class TestNextId:
    def setup_method(self):
        reset_id_counter()

    def test_generates_sequential_ids_with_default_prefix(self):
        assert next_id() == "msg_1"
        assert next_id() == "msg_2"
        assert next_id() == "msg_3"

    def test_uses_custom_prefix(self):
        assert next_id("ping") == "ping_1"
        assert next_id("hello") == "hello_2"

    def test_resets_counter(self):
        next_id()
        next_id()
        reset_id_counter()
        assert next_id() == "msg_1"
