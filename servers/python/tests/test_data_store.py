from starfish_server.data_store import ConflictError, DataStore


class TestDataStore:
    def test_replace(self):
        store = DataStore()
        entry = store.apply("replace", "key1", "session", "client_1", {"x": 1})
        assert entry.data == {"x": 1}
        assert entry.version == 1
        assert entry.updated_by == "client_1"

    def test_replace_increments_version(self):
        store = DataStore()
        store.apply("replace", "key1", "session", "client_1", "a")
        entry = store.apply("replace", "key1", "session", "client_1", "b")
        assert entry.version == 2
        assert entry.data == "b"

    def test_merge(self):
        store = DataStore()
        store.apply("replace", "key1", "session", "c1", {"a": 1, "b": 2})
        entry = store.apply("merge", "key1", "session", "c1", {"b": 3, "c": 4})
        assert entry.data == {"a": 1, "b": 3, "c": 4}

    def test_merge_non_object_existing(self):
        store = DataStore()
        store.apply("replace", "key1", "session", "c1", "not_an_object")
        entry = store.apply("merge", "key1", "session", "c1", {"x": 1})
        assert entry.data == {"x": 1}

    def test_set_add(self):
        store = DataStore()
        entry = store.apply("set.add", "tags", "session", "c1", "red")
        assert entry.data == ["red"]
        entry = store.apply("set.add", "tags", "session", "c1", "blue")
        assert entry.data == ["red", "blue"]
        # Duplicate
        entry = store.apply("set.add", "tags", "session", "c1", "red")
        assert entry.data == ["red", "blue"]

    def test_set_remove(self):
        store = DataStore()
        store.apply("replace", "tags", "session", "c1", ["a", "b", "c"])
        entry = store.apply("set.remove", "tags", "session", "c1", "b")
        assert entry.data == ["a", "c"]

    def test_list_add(self):
        store = DataStore()
        entry = store.apply("list.add", "items", "session", "c1", "x")
        assert entry.data == ["x"]
        entry = store.apply("list.add", "items", "session", "c1", "x")
        assert entry.data == ["x", "x"]  # Duplicates allowed

    def test_list_remove(self):
        store = DataStore()
        store.apply("replace", "items", "session", "c1", ["a", "b", "a"])
        entry = store.apply("list.remove", "items", "session", "c1", "a")
        assert entry.data == ["b"]

    def test_counter_add(self):
        store = DataStore()
        entry = store.apply("counter.add", "score", "session", "c1", 5)
        assert entry.data == 5
        entry = store.apply("counter.add", "score", "session", "c1", 3)
        assert entry.data == 8
        entry = store.apply("counter.add", "score", "session", "c1", -2)
        assert entry.data == 6

    def test_delete(self):
        store = DataStore()
        store.apply("replace", "key1", "session", "c1", "value")
        entry = store.apply("delete", "key1", "session", "c1", None)
        assert entry.data is None
        assert entry.version == 2

        # Get after delete returns empty
        entry = store.get("key1", "session", "c1")
        assert entry.data is None
        assert entry.version == 0

    def test_expected_version_success(self):
        store = DataStore()
        store.apply("replace", "key1", "session", "c1", "v1")
        entry = store.apply("replace", "key1", "session", "c1", "v2", expected_version=1)
        assert entry.data == "v2"

    def test_expected_version_conflict(self):
        store = DataStore()
        store.apply("replace", "key1", "session", "c1", "v1")
        try:
            store.apply("replace", "key1", "session", "c1", "v2", expected_version=0)
            assert False, "Should have raised ConflictError"
        except ConflictError as e:
            assert e.actual_version == 1
            assert e.current_data == "v1"

    def test_client_scope_isolation(self):
        store = DataStore()
        store.apply("replace", "key1", "self", "c1", "val1")
        store.apply("replace", "key1", "self", "c2", "val2")
        assert store.get("key1", "self", "c1").data == "val1"
        assert store.get("key1", "self", "c2").data == "val2"

    def test_session_scope_shared(self):
        store = DataStore()
        store.apply("replace", "key1", "session", "c1", "shared")
        assert store.get("key1", "session", "c2").data == "shared"

    def test_get_nonexistent(self):
        store = DataStore()
        entry = store.get("nope", "session", "c1")
        assert entry.data is None
        assert entry.version == 0

    def test_invalid_op(self):
        store = DataStore()
        try:
            store.apply("invalid_op", "key1", "session", "c1", None)
            assert False, "Should have raised ValueError"
        except ValueError:
            pass
