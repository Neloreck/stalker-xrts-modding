import { describe, expect, it, jest } from "@jest/globals";

import { getObjectIdByStoryId, getServerObjectByStoryId, getStoryIdByObjectId, registry } from "@/engine/core/database";
import { ItemAmmo } from "@/engine/core/objects/server/item/ItemAmmo";
import { mockIniFile } from "@/fixtures/xray/mocks/ini";

describe("Item server class", () => {
  it("should correctly create generic objects without story links", () => {
    const itemAmmo: ItemAmmo = new ItemAmmo("test-section");

    expect(itemAmmo.section_name()).toBe("test-section");
    expect(itemAmmo.keep_saved_data_anyway()).toBe(false);
    expect(itemAmmo.can_switch_online()).toBe(true);

    itemAmmo.on_register();

    expect(registry.storyLink.idBySid.length()).toBe(0);
    expect(registry.storyLink.sidById.length()).toBe(0);

    itemAmmo.on_unregister();

    expect(registry.storyLink.idBySid.length()).toBe(0);
    expect(registry.storyLink.sidById.length()).toBe(0);
  });

  it("should not switch online if is in secret", () => {
    const itemAmmo: ItemAmmo = new ItemAmmo("test-section");

    expect(itemAmmo.section_name()).toBe("test-section");
    expect(itemAmmo.keep_saved_data_anyway()).toBe(false);
    expect(itemAmmo.can_switch_online()).toBe(true);
    expect(itemAmmo.isSecretItem).toBe(false);

    itemAmmo.isSecretItem = true;

    expect(itemAmmo.can_switch_online()).toBe(false);
  });

  it("should correctly create generic objects with story links", () => {
    const itemAmmo: ItemAmmo = new ItemAmmo("test-section");

    jest.spyOn(itemAmmo, "spawn_ini").mockReturnValue(
      mockIniFile("spawn.ini", {
        story_object: {
          story_id: "test-story-id",
        },
      })
    );

    itemAmmo.on_register();

    expect(registry.storyLink.idBySid.length()).toBe(1);
    expect(registry.storyLink.sidById.length()).toBe(1);

    expect(getServerObjectByStoryId("test-story-id")).toBe(itemAmmo);
    expect(getObjectIdByStoryId("test-story-id")).toBe(itemAmmo.id);
    expect(getStoryIdByObjectId(itemAmmo.id)).toBe("test-story-id");

    itemAmmo.on_unregister();

    expect(registry.storyLink.idBySid.length()).toBe(0);
    expect(registry.storyLink.sidById.length()).toBe(0);
  });
});