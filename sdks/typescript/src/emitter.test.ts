import { describe, it, expect, vi } from "vitest";
import { Observable, EventStream } from "./emitter.js";

describe("Observable", () => {
  it("holds an initial value", () => {
    const obs = new Observable(42);
    expect(obs.value).toBe(42);
  });

  it("notifies subscribers on set", () => {
    const obs = new Observable(0);
    const callback = vi.fn();
    obs.subscribe(callback);

    obs.set(1);
    expect(callback).toHaveBeenCalledWith(1);

    obs.set(2);
    expect(callback).toHaveBeenCalledWith(2);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("updates current value on set", () => {
    const obs = new Observable("a");
    obs.set("b");
    expect(obs.value).toBe("b");
  });

  it("supports unsubscribe", () => {
    const obs = new Observable(0);
    const callback = vi.fn();
    const unsub = obs.subscribe(callback);

    obs.set(1);
    expect(callback).toHaveBeenCalledTimes(1);

    unsub();
    obs.set(2);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("supports multiple subscribers", () => {
    const obs = new Observable(0);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    obs.subscribe(cb1);
    obs.subscribe(cb2);

    obs.set(5);
    expect(cb1).toHaveBeenCalledWith(5);
    expect(cb2).toHaveBeenCalledWith(5);
  });
});

describe("EventStream", () => {
  it("emits values to subscribers", () => {
    const stream = new EventStream<string>();
    const callback = vi.fn();
    stream.subscribe(callback);

    stream.emit("hello");
    expect(callback).toHaveBeenCalledWith("hello");
  });

  it("supports unsubscribe", () => {
    const stream = new EventStream<number>();
    const callback = vi.fn();
    const unsub = stream.subscribe(callback);

    stream.emit(1);
    unsub();
    stream.emit(2);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
  });

  it("handles multiple subscribers", () => {
    const stream = new EventStream<number>();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    stream.subscribe(cb1);
    stream.subscribe(cb2);

    stream.emit(42);
    expect(cb1).toHaveBeenCalledWith(42);
    expect(cb2).toHaveBeenCalledWith(42);
  });
});
