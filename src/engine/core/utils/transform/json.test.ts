import { describe, expect, it, jest } from "@jest/globals";

import { quoted } from "#/utils/string";

import { stringifyKey, toJSON } from "@/engine/core/utils/transform/json";

describe("toJSON util", () => {
  it("toJSON should correctly stringify simple types", () => {
    expect(toJSON("abc")).toBe(quoted("abc"));
    expect(toJSON("bca")).toBe(quoted("bca"));
    expect(toJSON(123)).toBe("123");
    expect(toJSON(321)).toBe("321");
    expect(toJSON(true)).toBe("true");
    expect(toJSON(false)).toBe("false");
    expect(toJSON(null)).toBe(quoted("<nil>"));
    expect(toJSON(undefined)).toBe(quoted("<nil>"));
  });

  it("toJSON should correctly stringify tables", () => {
    expect(toJSON({})).toBe("{}");
    expect(toJSON({ a: 10 })).toBe(`{${quoted("a")}: 10}`);
    expect(toJSON({ b: "ab", c: 5, d: false, e: null })).toBe(
      `{${quoted("b")}: "ab", "c": 5, "d": false, "e": "<nil>"}`
    );
    expect(toJSON({ a: 10, b: { c: 1234 } })).toBe(`{${quoted("a")}: 10, "b": {"c": 1234}}`);
  });

  it("toJSON should correctly stringify circular references", () => {
    const base = { nested: { circular: {} } };

    base.nested.circular = base;

    expect(toJSON(base)).toBe(`{${quoted("nested")}: {"circular": "<circular_reference>"}}`);
  });

  it("toJSON should correctly limit depth", () => {
    const base = { nested: { nested: { nested: { nested: {} } } } };

    expect(toJSON(base, " ", 0, 3)).toBe(`{${quoted("nested")}: {"nested": {"nested": {"nested": "<depth_limit>"}}}}`);
    expect(toJSON(base, " ", 0, 2)).toBe(`{${quoted("nested")}: {"nested": {"nested": "<depth_limit>"}}}`);
    expect(toJSON(base, " ", 0, 1)).toBe(`{${quoted("nested")}: {"nested": "<depth_limit>"}}`);
    expect(toJSON(base, " ", 0, 0)).toBe(`{${quoted("nested")}: "<depth_limit>"}`);
  });

  it("toJSON should correctly transform unusual non-table values", () => {
    expect(toJSON(() => {})).toBe(quoted("<function>"));

    jest.spyOn(global, "type").mockReturnValueOnce("userdata");
    expect(toJSON({})).toBe(quoted("<userdata>"));

    jest.spyOn(global, "type").mockReturnValueOnce("thread");
    expect(toJSON({})).toBe(quoted("<unknown>"));
  });
});

describe("stringifyKey util", () => {
  it("correctly stringify json keys", () => {
    expect(stringifyKey(123)).toBe("123");
    expect(stringifyKey("abc")).toBe("abc");
    expect(stringifyKey(true)).toBe("<k_boolean>");
    expect(stringifyKey(() => {})).toBe("<k_function>");

    jest.spyOn(global, "type").mockReturnValueOnce("userdata");
    expect(stringifyKey({})).toBe("<k_userdata>");

    jest.spyOn(global, "type").mockReturnValueOnce("thread");
    expect(stringifyKey({})).toBe("<k_thread>");
  });
});
