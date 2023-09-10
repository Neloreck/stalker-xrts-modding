import { alife, level, time_global } from "xray16";

import {
  closeLoadMarker,
  closeSaveMarker,
  openLoadMarker,
  openSaveMarker,
  registry,
  SECRETS_LTX,
} from "@/engine/core/database";
import { AbstractManager } from "@/engine/core/managers/base/AbstractManager";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { ETreasureState, NotificationManager } from "@/engine/core/managers/notifications";
import { ITreasureDescriptor, ITreasureItemsDescriptor } from "@/engine/core/managers/treasures/treasures_types";
import { assert, assertDefined } from "@/engine/core/utils/assertion";
import {
  ISpawnDescriptor,
  parseConditionsList,
  parseSpawnDetails,
  pickSectionFromCondList,
} from "@/engine/core/utils/ini";
import { LuaLogger } from "@/engine/core/utils/logging";
import { getTableSize } from "@/engine/core/utils/table";
import { MAX_U16 } from "@/engine/lib/constants/memory";
import { SECRET_SECTION } from "@/engine/lib/constants/sections";
import { TRUE } from "@/engine/lib/constants/words";
import {
  AlifeSimulator,
  ClientObject,
  IniFile,
  LuaArray,
  NetPacket,
  NetProcessor,
  Optional,
  ServerObject,
  TCount,
  TName,
  TNumberId,
  TProbability,
  TSection,
  TStringId,
  TTimestamp,
} from "@/engine/lib/types";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Manager to handle treasures indication, giving and completion for actor.
 */
export class TreasureManager extends AbstractManager {
  /**
   * Share treasure coordinates with the actor.
   */
  public static giveTreasureCoordinates(treasureId: TStringId): void {
    return TreasureManager.getInstance().giveActorTreasureCoordinates(treasureId);
  }

  /**
   * Register server object in treasure manager.
   */
  public static registerItem(serverObject: ServerObject): boolean {
    return TreasureManager.getInstance().onRegisterItem(serverObject);
  }

  public areItemsSpawned: boolean = false;
  public lastUpdatedAt: TTimestamp = -Infinity;

  public secrets: LuaTable<TSection, ITreasureDescriptor> = new LuaTable();
  public secretsRestrictorByName: LuaTable<TName, TNumberId> = new LuaTable(); // Restrictor ID by name.
  public secretsRestrictorByItem: LuaTable<TNumberId, TNumberId> = new LuaTable(); // Restrictor ID by item ID.

  /**
   * Initialize secrets manager.
   */
  public override initialize(): void {
    const eventsManager: EventsManager = EventsManager.getInstance();

    eventsManager.registerCallback(EGameEvent.ACTOR_UPDATE, this.update, this);
    eventsManager.registerCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake, this);
    eventsManager.registerCallback(EGameEvent.RESTRICTOR_ZONE_REGISTERED, this.onRegisterRestrictor, this);

    this.initializeSecrets();
  }

  /**
   * Initialize secrets descriptors.
   */
  public initializeSecrets(): void {
    const totalSecretsCount: TCount = SECRETS_LTX.line_count("list");

    logger.info("Initialize secrets, expected:", totalSecretsCount);

    for (const it of $range(0, totalSecretsCount - 1)) {
      const [, treasureSection] = SECRETS_LTX.r_line<TStringId>("list", it, "", "");

      assert(SECRETS_LTX.section_exist(treasureSection), "There is no section [%s] in secrets.ltx", it);

      const descriptor: ITreasureDescriptor = {
        items: new LuaTable(),
        given: false,
        empty: null,
        refreshing: null,
        checked: false,
        itemsToFindRemain: 0,
      };

      this.secrets.set(treasureSection, descriptor);

      const itemsCount: TCount = SECRETS_LTX.line_count(treasureSection);

      for (const index of $range(0, itemsCount - 1)) {
        const [, itemSection, itemValue] = SECRETS_LTX.r_line(treasureSection, index, "", "");

        switch (itemSection) {
          case "empty":
            descriptor.empty = parseConditionsList(itemValue);
            break;

          case "refreshing":
            descriptor.refreshing = parseConditionsList(itemValue);
            break;

          default: {
            descriptor.items.set(itemSection, new LuaTable());

            const spawnDetails: LuaArray<ISpawnDescriptor> = parseSpawnDetails(itemValue);

            assert(
              spawnDetails.length() !== 0,
              "There is no items count set for treasure [%s], item [%s]",
              treasureSection,
              itemSection
            );

            for (const [, spawnDescriptor] of spawnDetails) {
              table.insert(descriptor.items.get(itemSection), {
                count: spawnDescriptor.count,
                probability: spawnDescriptor.probability ?? 1,
                itemsIds: null,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Destroy and unregister manager instance.
   */
  public override destroy(): void {
    const eventsManager: EventsManager = EventsManager.getInstance();

    eventsManager.unregisterCallback(EGameEvent.ACTOR_UPDATE, this.update);
    eventsManager.unregisterCallback(EGameEvent.ACTOR_ITEM_TAKE, this.onActorItemTake);
    eventsManager.unregisterCallback(EGameEvent.RESTRICTOR_ZONE_REGISTERED, this.onRegisterRestrictor);
  }

  /**
   * todo: Description.
   */
  public override update(): void {
    if (!this.areItemsSpawned) {
      this.spawnTreasures();
    }

    const now: TTimestamp = time_global();

    if (now - this.lastUpdatedAt >= 500) {
      this.lastUpdatedAt = now;
    } else {
      return;
    }

    for (const [treasureSection, treasureDescriptor] of this.secrets) {
      if (treasureDescriptor.given) {
        if (
          treasureDescriptor.empty &&
          !treasureDescriptor.checked &&
          pickSectionFromCondList(registry.actor, null, treasureDescriptor.empty) === TRUE
        ) {
          treasureDescriptor.empty = null;
          treasureDescriptor.checked = true;

          level.map_remove_object_spot(this.secretsRestrictorByName.get(treasureSection), "treasure");
        } else if (
          treasureDescriptor.refreshing &&
          treasureDescriptor.checked &&
          pickSectionFromCondList(registry.actor, null, treasureDescriptor.refreshing) === TRUE
        ) {
          treasureDescriptor.given = false;
          treasureDescriptor.checked = false;
        }
      }
    }
  }

  /**
   * todo: Description.
   */
  protected spawnTreasures(): void {
    if (this.areItemsSpawned) {
      return;
    }

    for (const [treasureId] of this.secrets) {
      this.spawnTreasure(treasureId);
    }

    this.areItemsSpawned = true;
  }

  /**
   * todo: Description.
   */
  protected spawnTreasure(treasureId: TStringId): void {
    // logger.info("Spawn treasure ID:", treasureId);

    assertDefined(this.secrets.get(treasureId), "There is no stored secret:", treasureId);

    if (this.secrets.get(treasureId).given) {
      logger.info("Spawned secret is already given:", treasureId);

      return;
    }

    const simulator: AlifeSimulator = alife();
    const secret: ITreasureDescriptor = this.secrets.get(treasureId);

    for (const [itemSection, itemParameters] of secret.items) {
      for (const it of $range(1, itemParameters.length())) {
        const itemDescriptor = itemParameters.get(it);

        for (const i of $range(1, itemDescriptor.count)) {
          const probability: TProbability = math.random();

          if (probability < itemDescriptor.probability) {
            if (itemDescriptor.itemsIds && itemDescriptor.itemsIds.get(i)) {
              const serverObject: ServerObject = simulator.object(itemParameters.get(it).itemsIds!.get(i))!;
              const object: ServerObject = simulator.create(
                itemSection,
                serverObject.position,
                serverObject.m_level_vertex_id,
                serverObject.m_game_vertex_id
              );

              object.angle = serverObject.angle;
              object.use_ai_locations(serverObject.used_ai_locations());

              this.secretsRestrictorByItem.set(object.id, this.secretsRestrictorByName.get(treasureId));

              secret.itemsToFindRemain = secret.itemsToFindRemain + 1;
            }
          }
        }
      }
    }
  }

  /**
   * todo: Description.
   */
  public giveActorTreasureCoordinates(treasureId: TStringId, spawn: boolean = false): void {
    logger.info("Give treasure:", treasureId, spawn);

    assertDefined(this.secrets.get(treasureId), "There is no stored secret: [%s]", tostring(treasureId));

    if (this.secrets.get(treasureId).given) {
      return logger.info("Already given treasure:", treasureId);
    }

    if (this.secrets.get(treasureId).itemsToFindRemain === 0 && !this.secrets.get(treasureId).empty) {
      NotificationManager.getInstance().sendTreasureNotification(ETreasureState.LOOTED_TREASURE_COORDINATES);

      return logger.info("Already empty treasure:", treasureId);
    }

    if (spawn) {
      this.spawnTreasure(treasureId);
    }

    level.map_add_object_spot_ser(this.secretsRestrictorByName.get(treasureId), "treasure", "");

    this.secrets.get(treasureId).given = true;
    NotificationManager.getInstance().sendTreasureNotification(ETreasureState.NEW_TREASURE_COORDINATES);
  }

  /**
   * todo: Description.
   */
  public giveActorRandomTreasureCoordinates(): void {
    logger.info("Give random treasure");

    const availableTreasures: LuaArray<TStringId> = new LuaTable();

    for (const [k, v] of this.secrets) {
      if (!v.given) {
        table.insert(availableTreasures, k);
      }
    }

    if (availableTreasures.length() !== 0) {
      this.giveActorTreasureCoordinates(availableTreasures.get(math.random(1, availableTreasures.length())));
    } else {
      logger.info("No available treasures to give random");
    }
  }

  /**
   * todo: Description.
   */
  public onRegisterItem(object: ServerObject): boolean {
    const spawnIni: IniFile = object.spawn_ini();

    if (!spawnIni.section_exist(SECRET_SECTION)) {
      return false;
    }

    const [, section, value] = spawnIni.r_line<string, TStringId | "">(SECRET_SECTION, 0, "", "");

    assert(section === "name", "There is no 'name' field in [secret] section for object [%s].", object.name());
    assert(value !== "", "Field 'name' in [secret] section got no value for object [%s].", object.name());
    assert(
      this.secrets.get(value) !== null,
      "Attempt to register item [%s] in unexistent secret [%s].",
      object.name(),
      value
    );

    const item: LuaArray<ITreasureItemsDescriptor> = this.secrets.get(value).items.get(object.section_name());

    assert(item !== null, "Attempt to register unknown item [%s] in secret [%s].", object.section_name(), value);

    for (const it of $range(1, item.length())) {
      if (!item.get(it).itemsIds) {
        item.get(it).itemsIds = new LuaTable();
      }

      const count: TCount = item.get(it).itemsIds!.length();

      if (count < item.get(it).count) {
        item.get(it).itemsIds!.set(count + 1, object.id);

        return true;
      }
    }

    return false;
  }

  /**
   * Register game restrictor linked with secret.
   * Note: name of restrictor should match secret section.
   *
   * @param object - restrictor zone server object
   */
  public onRegisterRestrictor(object: ServerObject): boolean {
    if (object.spawn_ini().section_exist(SECRET_SECTION)) {
      this.secretsRestrictorByName.set(object.name(), object.id);

      return true;
    } else {
      return false;
    }
  }

  /**
   * On item taken by actor, verify it is part of treasure.
   */
  public onActorItemTake(object: ClientObject): void {
    const objectId: TNumberId = object.id();
    const restrictorId: Optional<TNumberId> = this.secretsRestrictorByItem.get(objectId);

    let treasureId: Optional<TStringId> = null;

    for (const [k, v] of this.secretsRestrictorByName) {
      if (restrictorId === v) {
        treasureId = k as TStringId;
        break;
      }
    }

    if (treasureId) {
      logger.info("Treasure item taken:", objectId);

      const treasureDescriptor: ITreasureDescriptor = this.secrets.get(treasureId);

      treasureDescriptor.itemsToFindRemain -= 1;

      if (this.secrets.get(treasureId).itemsToFindRemain === 0) {
        level.map_remove_object_spot(this.secretsRestrictorByName.get(treasureId), "treasure");
        EventsManager.emitEvent(EGameEvent.TREASURE_FOUND, treasureDescriptor);
        this.secrets.get(treasureId).checked = true;
        NotificationManager.getInstance().sendTreasureNotification(ETreasureState.FOUND_TREASURE);

        logger.info("Secret now is empty:", treasureId);
      }

      this.secretsRestrictorByItem.delete(objectId);
    }
  }

  /**
   * Save manager data in network packet.
   */
  public override save(packet: NetPacket): void {
    openSaveMarker(packet, TreasureManager.name);

    packet.w_bool(this.areItemsSpawned);
    packet.w_u16(getTableSize(this.secretsRestrictorByItem));

    for (const [k, v] of this.secretsRestrictorByItem) {
      packet.w_u16(k);
      packet.w_u16(v);
    }

    packet.w_u16(getTableSize(this.secrets));

    for (const [treasure, descriptor] of this.secrets) {
      if (!this.secretsRestrictorByName.get(treasure)) {
        packet.w_u16(-1);
      } else {
        packet.w_u16(this.secretsRestrictorByName.get(treasure));
      }

      packet.w_bool(descriptor.given);
      packet.w_bool(descriptor.checked);
      packet.w_u8(descriptor.itemsToFindRemain);
    }

    closeSaveMarker(packet, TreasureManager.name);
  }

  /**
   * Load data from network processor.
   */
  public override load(reader: NetProcessor): void {
    openLoadMarker(reader, TreasureManager.name);

    this.areItemsSpawned = reader.r_bool();
    this.secretsRestrictorByItem = new LuaTable();

    const itemsCount: TCount = reader.r_u16();

    for (const it of $range(1, itemsCount)) {
      const k: number = reader.r_u16();
      const v: number = reader.r_u16();

      this.secretsRestrictorByItem.set(k, v);
    }

    const secretsCount: TCount = reader.r_u16();

    for (const index of $range(1, secretsCount)) {
      let id: number | string = reader.r_u16();

      for (const [k, v] of this.secretsRestrictorByName) {
        if (v === id) {
          id = k;
          break;
        }
      }

      const isGiven: boolean = reader.r_bool();
      const isChecked: boolean = reader.r_bool();
      const isToFind: number = reader.r_u8();

      if (id !== MAX_U16 && this.secrets.get(id as any)) {
        const secret: ITreasureDescriptor = this.secrets.get(id as any);

        secret.given = isGiven;
        secret.checked = isChecked;
        secret.itemsToFindRemain = isToFind;
      }
    }

    closeLoadMarker(reader, TreasureManager.name);
  }
}