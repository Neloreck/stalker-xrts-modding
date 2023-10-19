import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { IRegistryObjectState, registerSimulator, registry } from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { WeaponBinder } from "@/engine/core/objects/binders/item/WeaponBinder";
import { ItemWeapon } from "@/engine/core/objects/server/item/ItemWeapon";
import { resetRegistry } from "@/fixtures/engine";
import { mockGameObject, mockServerAlifeObject } from "@/fixtures/xray";

describe("WeaponBinder class", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
  });

  it("should correctly handle going online/offline and release", () => {
    const binder: WeaponBinder = new WeaponBinder(mockGameObject());
    const serverObject: ItemWeapon = mockServerAlifeObject({
      id: binder.object.id(),
    }) as ItemWeapon;

    expect(registry.objects.length()).toBe(0);
    expect(registry.dynamicData.objects.length()).toBe(0);

    binder.net_spawn(serverObject);

    expect(registry.objects.length()).toBe(1);
    expect(registry.dynamicData.objects.length()).toBe(1);

    const previous: IRegistryObjectState = registry.objects.get(binder.object.id());

    binder.reinit();

    expect(registry.objects.get(binder.object.id())).not.toBe(previous);

    binder.net_destroy();

    expect(registry.objects.length()).toBe(0);
    expect(registry.dynamicData.objects.length()).toBe(1);

    binder.net_Relcase(binder.object);

    expect(registry.objects.length()).toBe(0);
    expect(registry.dynamicData.objects.length()).toBe(0);
  });

  it("should correctly emit lifecycle signals", () => {
    const eventsManager: EventsManager = EventsManager.getInstance();
    const binder: WeaponBinder = new WeaponBinder(mockGameObject());

    const onGoOnlineFirstTime = jest.fn();
    const onGoOnline = jest.fn();
    const onGoOffline = jest.fn();

    eventsManager.registerCallback(EGameEvent.ITEM_WEAPON_GO_ONLINE_FIRST_TIME, onGoOnlineFirstTime);
    eventsManager.registerCallback(EGameEvent.ITEM_WEAPON_GO_ONLINE, onGoOnline);
    eventsManager.registerCallback(EGameEvent.ITEM_WEAPON_GO_OFFLINE, onGoOffline);

    binder.net_spawn(
      mockServerAlifeObject({
        id: binder.object.id(),
      }) as ItemWeapon
    );

    expect(onGoOnlineFirstTime).toHaveBeenCalledWith(binder.object, binder);
    expect(onGoOnline).toHaveBeenCalledWith(binder.object, binder);
    expect(onGoOffline).not.toHaveBeenCalled();

    binder.net_destroy();

    expect(onGoOnlineFirstTime).toHaveBeenCalledTimes(1);
    expect(onGoOnline).toHaveBeenCalledTimes(1);
    expect(onGoOffline).toHaveBeenCalledTimes(1);
    expect(onGoOffline).toHaveBeenCalledWith(binder.object, binder);

    binder.net_spawn(
      mockServerAlifeObject({
        id: binder.object.id(),
      }) as ItemWeapon
    );

    expect(onGoOnlineFirstTime).toHaveBeenCalledTimes(1);
    expect(onGoOnline).toHaveBeenCalledTimes(2);
    expect(onGoOffline).toHaveBeenCalledTimes(1);
  });
});