import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { callback, CGameTask, level, time_global } from "xray16";

import { ActorBinder } from "@/engine/core/binders/creature/ActorBinder";
import {
  getManager,
  IRegistryObjectState,
  registerSimulator,
  registerZone,
  registry,
  setPortableStoreValue,
} from "@/engine/core/database";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { SaveManager } from "@/engine/core/managers/save";
import { TSimulationObject } from "@/engine/core/managers/simulation/types";
import { ISchemeDeimosState, SchemeDeimos } from "@/engine/core/schemes/restrictor/sr_deimos";
import { setStableAlifeObjectsUpdate } from "@/engine/core/utils/alife";
import { MAX_ALIFE_ID } from "@/engine/lib/constants/memory";
import { EScheme, GameObject, ServerActorObject } from "@/engine/lib/types";
import { mockRegisteredActor, mockSchemeState, resetRegistry } from "@/fixtures/engine";
import { replaceFunctionMockOnce, resetFunctionMock } from "@/fixtures/jest";
import {
  EPacketDataType,
  MockAlifeCreatureActor,
  MockCGameTask,
  MockGameObject,
  MockNetProcessor,
  MockObjectBinder,
} from "@/fixtures/xray";

describe("ActorBinder", () => {
  beforeEach(() => {
    resetRegistry();
    registerSimulator();
    resetFunctionMock(level.show_indicators);
    resetFunctionMock(level.show_weapon);
  });

  it("should correctly initialize", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const binder: ActorBinder = new ActorBinder(actor);

    expect(binder.isFirstUpdatePerformed).toBe(false);
    expect(binder.deimosIntensity).toBeNull();
    expect(binder.eventsManager).toBe(getManager(EventsManager));
  });

  it("should correctly handle net spawn / destroy", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const serverActor: ServerActorObject = MockAlifeCreatureActor.mock();
    const binder: ActorBinder = new ActorBinder(actor);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent");

    binder.net_spawn(serverActor);

    const state: IRegistryObjectState = registry.objects.get(actor.id());

    expect(level.show_indicators).toHaveBeenCalledTimes(1);
    expect(registry.actor).toBe(actor);
    expect(state).not.toBeNull();
    expect(state.portableStore).not.toBeNull();
    expect(eventsManager.emitEvent).toHaveBeenCalledTimes(1);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_GO_ONLINE, binder);

    binder.net_destroy();

    expect(registry.actor).toBeNull();
    expect(registry.objects.length()).toBe(0);
    expect(level.show_weapon).toHaveBeenCalledWith(true);
    expect(eventsManager.emitEvent).toHaveBeenCalledTimes(2);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_GO_OFFLINE, binder);

    expect(actor.set_callback).toHaveBeenCalledTimes(10);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.inventory_info, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.article_info, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.on_item_take, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.on_item_drop, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.trade_sell_buy_item, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.task_state, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.level_border_enter, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.level_border_exit, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.take_item_from_box, null);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.use_object, null);
  });

  it("should correctly handle net spawn / destroy when spawn check is falsy", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const serverActor: ServerActorObject = MockAlifeCreatureActor.mock();
    const binder: ActorBinder = new ActorBinder(actor);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent");

    (binder as unknown as MockObjectBinder).canSpawn = false;

    binder.net_spawn(serverActor);

    expect(registry.actor).toBeNull();
    expect(registry.objects.length()).toBe(0);
    expect(eventsManager.emitEvent).toHaveBeenCalledTimes(0);
    expect(actor.set_callback).toHaveBeenCalledTimes(0);
  });

  it("should correctly handle re-init", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const binder: ActorBinder = new ActorBinder(actor);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent");
    jest.spyOn(eventsManager, "registerGameTimeout");

    binder.reinit();

    const state: IRegistryObjectState = registry.objects.get(actor.id());

    expect(registry.actor).toBe(actor);
    expect(state).not.toBeNull();
    expect(state.portableStore).not.toBeNull();

    expect(actor.set_callback).toHaveBeenCalledTimes(8);
    expect(actor.set_callback).toHaveBeenCalledWith(callback.inventory_info, expect.any(Function));
    expect(actor.set_callback).toHaveBeenCalledWith(callback.take_item_from_box, expect.any(Function));
    expect(actor.set_callback).toHaveBeenCalledWith(callback.on_item_take, expect.any(Function));
    expect(actor.set_callback).toHaveBeenCalledWith(callback.on_item_drop, expect.any(Function));
    expect(actor.set_callback).toHaveBeenCalledWith(callback.trade_sell_buy_item, expect.any(Function));
    expect(actor.set_callback).toHaveBeenCalledWith(callback.task_state, expect.any(Function));
    expect(actor.set_callback).toHaveBeenCalledWith(callback.use_object, expect.any(Function));
    expect(actor.set_callback).toHaveBeenCalledWith(callback.hud_animation_end, expect.any(Function));

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_REINIT, binder);
  });

  it("should correctly force infinite alife update on re-init", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const binder: ActorBinder = new ActorBinder(actor);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "registerGameTimeout");

    binder.reinit();

    expect(registry.simulator.set_objects_per_update).toHaveBeenCalledTimes(1);
    expect(registry.simulator.set_objects_per_update).toHaveBeenCalledWith(MAX_ALIFE_ID);

    expect(eventsManager.registerGameTimeout).toHaveBeenCalledWith(setStableAlifeObjectsUpdate, 3000);
  });

  it("should correctly handle save/load with default values", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();
    const saveManager: SaveManager = getManager(SaveManager);
    const processor: MockNetProcessor = new MockNetProcessor();
    const binder: ActorBinder = new ActorBinder(actorGameObject);

    jest.spyOn(saveManager, "clientSave").mockImplementation(jest.fn());
    jest.spyOn(saveManager, "clientLoad").mockImplementation(jest.fn());

    binder.net_spawn(actorServerObject);
    binder.reinit();
    binder.save(processor.asNetPacket());

    expect(saveManager.clientSave).toHaveBeenCalledWith(processor);
    expect(processor.writeDataOrder).toEqual([
      EPacketDataType.STRING,
      EPacketDataType.U32,
      EPacketDataType.BOOLEAN,
      EPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual(["save_from_ActorBinder", 0, false, 3]);

    const newBinder: ActorBinder = new ActorBinder(actorGameObject);

    newBinder.isFirstUpdatePerformed = true;
    newBinder.load(processor.asNetReader());

    expect(newBinder.isFirstUpdatePerformed).toBe(false);
    expect(saveManager.clientLoad).toHaveBeenCalledWith(processor);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should correctly handle save/load with deimos and pstore values", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();
    const saveManager: SaveManager = getManager(SaveManager);
    const processor: MockNetProcessor = new MockNetProcessor();
    const binder: ActorBinder = new ActorBinder(actorGameObject);

    const firstZone: GameObject = MockGameObject.mock();
    const secondZone: GameObject = MockGameObject.mock();

    registerZone(firstZone);
    registerZone(secondZone);

    const secondState: IRegistryObjectState = registry.objects.get(secondZone.id());

    secondState.activeSection = SchemeDeimos.SCHEME_SECTION;
    secondState[SchemeDeimos.SCHEME_SECTION] = mockSchemeState<ISchemeDeimosState>(EScheme.SR_DEIMOS, {
      intensity: 11.5,
    });

    jest.spyOn(saveManager, "clientSave").mockImplementation(jest.fn());
    jest.spyOn(saveManager, "clientLoad").mockImplementation(jest.fn());

    binder.net_spawn(actorServerObject);
    binder.reinit();

    setPortableStoreValue(actorGameObject.id(), "test-1", "value");
    setPortableStoreValue(actorGameObject.id(), "test-2", "value");

    binder.save(processor.asNetPacket());

    expect(saveManager.clientSave).toHaveBeenCalledWith(processor);
    expect(processor.writeDataOrder).toEqual([
      EPacketDataType.STRING,
      EPacketDataType.U32,
      EPacketDataType.STRING,
      EPacketDataType.U8,
      EPacketDataType.STRING,
      EPacketDataType.STRING,
      EPacketDataType.U8,
      EPacketDataType.STRING,
      EPacketDataType.BOOLEAN,
      EPacketDataType.F32,
      EPacketDataType.U16,
    ]);
    expect(processor.dataList).toEqual([
      "save_from_ActorBinder",
      2,
      "test-1",
      1,
      "value",
      "test-2",
      1,
      "value",
      true,
      11.5,
      10,
    ]);

    const newBinder: ActorBinder = new ActorBinder(actorGameObject);

    newBinder.load(processor.asNetReader());

    expect(saveManager.clientLoad).toHaveBeenCalledWith(processor);
    expect(processor.readDataOrder).toEqual(processor.writeDataOrder);
    expect(processor.dataList).toHaveLength(0);
  });

  it("should correctly handle actor object callbacks emit", () => {
    const actor: GameObject = MockGameObject.mockActor();
    const serverActor: ServerActorObject = MockAlifeCreatureActor.mock();
    const binder: ActorBinder = new ActorBinder(actor);
    const eventsManager: EventsManager = getManager(EventsManager);

    const box: GameObject = MockGameObject.mock();
    const item: GameObject = MockGameObject.mock();
    const task: CGameTask = MockCGameTask.mock();

    jest.spyOn(eventsManager, "emitEvent").mockImplementation(jest.fn());

    binder.net_spawn(serverActor);
    binder.reinit();

    MockGameObject.callCallback(actor, callback.inventory_info, actor, "test-info");
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_INFO_UPDATE, actor, "test-info");

    MockGameObject.callCallback(actor, callback.take_item_from_box, box, item);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_TAKE_BOX_ITEM, box, item);

    MockGameObject.callCallback(actor, callback.on_item_take, item);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_ITEM_TAKE, item);

    MockGameObject.callCallback(actor, callback.on_item_drop, item);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_ITEM_DROP, item);

    MockGameObject.callCallback(actor, callback.on_item_drop, item);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_ITEM_DROP, item);

    MockGameObject.callCallback(actor, callback.trade_sell_buy_item, item, "sell", 100);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_TRADE, item, "sell", 100);

    MockGameObject.callCallback(actor, callback.task_state, task, 0);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.TASK_STATE_UPDATE, task, 0);

    MockGameObject.callCallback(actor, callback.use_object, box);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_USE_ITEM, box);
  });
});

describe("ActorBinder update events", () => {
  it("should correctly handle update event", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();

    const binder: ActorBinder = new ActorBinder(actorGameObject);
    const eventsManager: EventsManager = getManager(EventsManager);

    jest.spyOn(eventsManager, "emitEvent");
    jest.spyOn(eventsManager, "tick");

    expect(binder.isFirstUpdatePerformed).toBe(false);

    (actorServerObject as TSimulationObject).isSimulationAvailable = jest.fn(() => true);

    binder.update(521);

    expect(binder.isFirstUpdatePerformed).toBe(true);
    expect(eventsManager.emitEvent).toHaveBeenCalledTimes(7);
    expect(eventsManager.tick).toHaveBeenCalledTimes(1);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_FIRST_UPDATE, 521, binder);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE, 521, binder);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_100, 521, binder);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_500, 521, binder);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_1000, 521, binder);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_5000, 521, binder);
    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_10000, 521, binder);

    expect(registry.simulationObjects.get(actorGameObject.id())).toBe(actorServerObject);

    (actorServerObject as TSimulationObject).isSimulationAvailable = jest.fn(() => false);

    binder.update(551);

    expect(eventsManager.emitEvent).toHaveBeenCalledTimes(8);
    expect(eventsManager.tick).toHaveBeenCalledTimes(2);

    expect(registry.simulationObjects.length()).toBe(0);
  });

  it("should correctly handle update event 100 throttling", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();

    const binder: ActorBinder = new ActorBinder(actorGameObject);
    const eventsManager: EventsManager = getManager(EventsManager);

    (actorServerObject as TSimulationObject).isSimulationAvailable = jest.fn(() => true);
    replaceFunctionMockOnce(time_global, () => 0);

    jest.spyOn(eventsManager, "emitEvent");
    jest.spyOn(eventsManager, "tick");

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_100, 999, binder);
    expect(binder.nextUpdate100).toBe(100);

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(9999);

    expect(eventsManager.emitEvent).not.toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_100, 9999, binder);
    expect(binder.nextUpdate100).toBe(100);

    replaceFunctionMockOnce(time_global, () => 100);
    binder.update(9999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_100, 9999, binder);
    expect(binder.nextUpdate100).toBe(200);
  });

  it("should correctly handle update event 500 throttling", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();

    const binder: ActorBinder = new ActorBinder(actorGameObject);
    const eventsManager: EventsManager = getManager(EventsManager);

    (actorServerObject as TSimulationObject).isSimulationAvailable = jest.fn(() => true);
    replaceFunctionMockOnce(time_global, () => 0);

    jest.spyOn(eventsManager, "emitEvent");
    jest.spyOn(eventsManager, "tick");

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_500, 999, binder);
    expect(binder.nextUpdate500).toBe(500);

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(9999);

    expect(eventsManager.emitEvent).not.toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_500, 9999, binder);
    expect(binder.nextUpdate500).toBe(500);

    replaceFunctionMockOnce(time_global, () => 500);
    binder.update(9999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_500, 9999, binder);
    expect(binder.nextUpdate500).toBe(1000);
  });

  it("should correctly handle update event 1000 throttling", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();

    const binder: ActorBinder = new ActorBinder(actorGameObject);
    const eventsManager: EventsManager = getManager(EventsManager);

    (actorServerObject as TSimulationObject).isSimulationAvailable = jest.fn(() => true);
    replaceFunctionMockOnce(time_global, () => 0);

    jest.spyOn(eventsManager, "emitEvent");
    jest.spyOn(eventsManager, "tick");

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_1000, 999, binder);
    expect(binder.nextUpdate1000).toBe(1000);

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(9999);

    expect(eventsManager.emitEvent).not.toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_1000, 9999, binder);
    expect(binder.nextUpdate1000).toBe(1000);

    replaceFunctionMockOnce(time_global, () => 1000);
    binder.update(9999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_1000, 9999, binder);
    expect(binder.nextUpdate1000).toBe(2000);
  });

  it("should correctly handle update event 5000 throttling", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();

    const binder: ActorBinder = new ActorBinder(actorGameObject);
    const eventsManager: EventsManager = getManager(EventsManager);

    (actorServerObject as TSimulationObject).isSimulationAvailable = jest.fn(() => true);
    replaceFunctionMockOnce(time_global, () => 0);

    jest.spyOn(eventsManager, "emitEvent");
    jest.spyOn(eventsManager, "tick");

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_5000, 999, binder);
    expect(binder.nextUpdate5000).toBe(5000);

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(9999);

    expect(eventsManager.emitEvent).not.toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_5000, 9999, binder);
    expect(binder.nextUpdate5000).toBe(5000);

    replaceFunctionMockOnce(time_global, () => 5000);
    binder.update(9999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_5000, 9999, binder);
    expect(binder.nextUpdate5000).toBe(10000);
  });

  it("should correctly handle update event 10000 throttling", () => {
    const { actorGameObject, actorServerObject } = mockRegisteredActor();

    const binder: ActorBinder = new ActorBinder(actorGameObject);
    const eventsManager: EventsManager = getManager(EventsManager);

    (actorServerObject as TSimulationObject).isSimulationAvailable = jest.fn(() => true);
    replaceFunctionMockOnce(time_global, () => 0);

    jest.spyOn(eventsManager, "emitEvent");
    jest.spyOn(eventsManager, "tick");

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_10000, 999, binder);
    expect(binder.nextUpdate10000).toBe(10000);

    replaceFunctionMockOnce(time_global, () => 0);
    binder.update(9999);

    expect(eventsManager.emitEvent).not.toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_10000, 9999, binder);
    expect(binder.nextUpdate10000).toBe(10000);

    replaceFunctionMockOnce(time_global, () => 10000);
    binder.update(9999);

    expect(eventsManager.emitEvent).toHaveBeenCalledWith(EGameEvent.ACTOR_UPDATE_10000, 9999, binder);
    expect(binder.nextUpdate10000).toBe(20000);
  });
});
