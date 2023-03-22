import { describe, expect, it } from "@jest/globals";

import { textures } from "@/engine/lib/constants/textures";

describe("'textures' constants integrity", () => {
  it("should match key-value entries", () => {
    // Slashes are not valid key names so replace them with '_'.
    Object.entries(textures).forEach(([key, value]) => expect(key).toBe(String(value).replace(/\\/g, "_")));
  });
});