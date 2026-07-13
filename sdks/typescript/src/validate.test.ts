import { describe, it, expect } from "vitest";
import { validateSerializable } from "./validate.js";

describe("validateSerializable", () => {
  it("accepts strings, numbers, booleans, and null", () => {
    expect(() => validateSerializable("hello", "val")).not.toThrow();
    expect(() => validateSerializable(42, "val")).not.toThrow();
    expect(() => validateSerializable(true, "val")).not.toThrow();
    expect(() => validateSerializable(null, "val")).not.toThrow();
  });

  it("accepts plain objects and arrays", () => {
    expect(() => validateSerializable({ a: 1, b: "two" }, "val")).not.toThrow();
    expect(() => validateSerializable([1, 2, 3], "val")).not.toThrow();
  });

  it("accepts deeply nested serializable data", () => {
    const data = { users: [{ name: "Alice", scores: [1, 2, 3] }] };
    expect(() => validateSerializable(data, "val")).not.toThrow();
  });

  it("rejects top-level function", () => {
    expect(() => validateSerializable(() => {}, "val")).toThrow(
      "val is a function and cannot be serialized",
    );
  });

  it("rejects nested function", () => {
    const data = { user: { callback: () => {} } };
    expect(() => validateSerializable(data, "data")).toThrow(
      "data.user.callback is a function and cannot be serialized",
    );
  });

  it("rejects undefined in object", () => {
    const data = { a: undefined };
    expect(() => validateSerializable(data, "val")).toThrow(
      "val.a is undefined and cannot be serialized",
    );
  });

  it("rejects undefined in array", () => {
    const data = [1, undefined, 3];
    expect(() => validateSerializable(data, "val")).toThrow(
      "val[1] is undefined and cannot be serialized",
    );
  });

  it("rejects symbol", () => {
    const data = { id: Symbol("id") };
    expect(() => validateSerializable(data, "val")).toThrow(
      "val.id is a symbol and cannot be serialized",
    );
  });

  it("rejects bigint", () => {
    const data = { count: BigInt(42) };
    expect(() => validateSerializable(data, "val")).toThrow(
      "val.count is a bigint and cannot be serialized",
    );
  });

  it("rejects circular object reference", () => {
    const data: any = { a: {} };
    data.a.self = data;
    expect(() => validateSerializable(data, "val")).toThrow(
      "val.a.self contains a circular reference",
    );
  });

  it("rejects circular array reference", () => {
    const data: any[] = [1, 2];
    data.push(data);
    expect(() => validateSerializable(data, "val")).toThrow("val[2] contains a circular reference");
  });

  it("allows the same object referenced in multiple places (non-circular)", () => {
    const shared = { x: 1 };
    const data = { a: shared, b: shared };
    expect(() => validateSerializable(data, "val")).not.toThrow();
  });

  it("includes full path for deeply nested invalid values", () => {
    const data = { users: [{ settings: { notify: () => {} } }] };
    expect(() => validateSerializable(data, "data")).toThrow(
      "data.users[0].settings.notify is a function and cannot be serialized",
    );
  });
});
