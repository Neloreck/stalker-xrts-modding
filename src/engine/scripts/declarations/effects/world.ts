import {
  alife,
  level,
  patrol,
  vector,
  XR_cse_alife_human_abstract,
  XR_cse_alife_item_artefact,
  XR_cse_alife_item_weapon,
  XR_game_object,
} from "xray16";

import { getObjectByStoryId, getObjectIdByStoryId, IRegistryObjectState, registry } from "@/engine/core/database";
import { SimulationBoardManager } from "@/engine/core/managers/interaction/SimulationBoardManager";
import { GlobalSoundManager } from "@/engine/core/managers/sounds/GlobalSoundManager";
import { SurgeManager } from "@/engine/core/managers/world/SurgeManager";
import { WeatherManager } from "@/engine/core/managers/world/WeatherManager";
import { SmartTerrain } from "@/engine/core/objects";
import { abort } from "@/engine/core/utils/assertion";
import { extern } from "@/engine/core/utils/binding";
import { isStalker } from "@/engine/core/utils/check/is";
import { LuaLogger } from "@/engine/core/utils/logging";
import { spawnItemsForObject } from "@/engine/core/utils/spawn";
import { TCommunity } from "@/engine/lib/constants/communities";
import { quest_items } from "@/engine/lib/constants/items/quest_items";
import { weapons } from "@/engine/lib/constants/items/weapons";
import { TRUE } from "@/engine/lib/constants/words";
import { LuaArray, Optional, TName, TNumberId, TSection, TStringId } from "@/engine/lib/types";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
extern(
  "xr_effects.play_sound",
  (
    actor: XR_game_object,
    object: XR_game_object,
    p: [Optional<TName>, Optional<TCommunity>, Optional<string | number>]
  ): void => {
    const theme = p[0];
    const faction: Optional<TCommunity> = p[1];
    const smartTerrain: SmartTerrain = SimulationBoardManager.getInstance().getSmartTerrainByName(
      p[2] as TName
    ) as SmartTerrain;
    const smartTerrainId: TNumberId = smartTerrain !== null ? smartTerrain.id : (p[2] as TNumberId);

    if (object && isStalker(object)) {
      if (!object.alive()) {
        abort(
          "Stalker [%s][%s] is dead, but you wants to say something for you. [%s]!",
          tostring(object.id()),
          tostring(object.name()),
          p[0]
        );
      }
    }

    GlobalSoundManager.getInstance().playSound(object.id(), theme, faction, smartTerrainId);
  }
);

/**
 * todo;
 */
extern("xr_effects.stop_sound", (actor: XR_game_object, object: XR_game_object): void => {
  GlobalSoundManager.getInstance().stopSoundByObjectId(object.id());
});

/**
 * todo;
 */
extern("xr_effects.play_sound_looped", (actor: XR_game_object, object: XR_game_object, params: [string]): void => {
  GlobalSoundManager.getInstance().playLoopedSound(object.id(), params[0]);
});

/**
 * todo;
 */
extern("xr_effects.stop_sound_looped", (actor: XR_game_object, object: XR_game_object) => {
  GlobalSoundManager.getInstance().stopLoopedSound(object.id(), null);
});

/**
 * todo;
 */
extern(
  "xr_effects.play_sound_by_story",
  (actor: XR_game_object, object: XR_game_object, p: [string, string, string, TName | number]) => {
    const storyObjectId: Optional<TNumberId> = getObjectIdByStoryId(p[0]);
    const theme = p[1];
    const faction = p[2];

    const smartTerrain: Optional<SmartTerrain> = SimulationBoardManager.getInstance().getSmartTerrainByName(
      p[3] as TName
    );
    const smartTerrainId: TNumberId = smartTerrain !== null ? smartTerrain.id : (p[3] as number);

    GlobalSoundManager.getInstance().playSound(storyObjectId as number, theme, faction, smartTerrainId);
  }
);

/**
 * todo;
 */
extern("xr_effects.reset_sound_npc", (actor: XR_game_object, npc: XR_game_object): void => {
  const objectId: TNumberId = npc.id();

  if (registry.sounds.generic.get(objectId) !== null) {
    registry.sounds.generic.get(objectId).reset(objectId);
  }
});

/**
 * todo;
 */
extern("xr_effects.barrel_explode", (actor: XR_game_object, object: XR_game_object, p: [TStringId]) => {
  const explodeObject: Optional<XR_game_object> = getObjectByStoryId(p[0]);

  if (explodeObject !== null) {
    explodeObject.explode(0);
  }
});

/**
 * todo;
 */
extern("xr_effects.set_game_time", (actor: XR_game_object, object: XR_game_object, params: [string, string]) => {
  logger.info("Set game time:", params[0], params[1]);

  const real_hours = level.get_time_hours();
  const real_minutes = level.get_time_minutes();

  const hours: number = tonumber(params[0])!;
  let minutes: number = tonumber(params[1])!;

  if (params[1] === null) {
    minutes = 0;
  }

  let hours_to_change: number = hours - real_hours;

  if (hours_to_change <= 0) {
    hours_to_change = hours_to_change + 24;
  }

  let minutes_to_change = minutes - real_minutes;

  if (minutes_to_change <= 0) {
    minutes_to_change = minutes_to_change + 60;
    hours_to_change = hours_to_change - 1;
  } else if (hours === real_hours) {
    hours_to_change = hours_to_change - 24;
  }

  level.change_game_time(0, hours_to_change, minutes_to_change);
  WeatherManager.getInstance().forceWeatherChange();
  SurgeManager.getInstance().isTimeForwarded = true;
});

/**
 * todo;
 */
extern("xr_effects.forward_game_time", (actor: XR_game_object, object: XR_game_object, p: [string, string]) => {
  logger.info("Forward game time");

  if (!p) {
    abort("Insufficient || invalid parameters in function 'forward_game_time'!");
  }

  const hours: number = tonumber(p[0])!;
  let minutes: number = tonumber(p[1])!;

  if (p[1] === null) {
    minutes = 0;
  }

  level.change_game_time(0, hours, minutes);
  WeatherManager.getInstance().forceWeatherChange();
  SurgeManager.getInstance().isTimeForwarded = true;
});

// todo: Rework, looks bad
extern(
  "xr_effects.pick_artefact_from_anomaly",
  (
    actor: XR_game_object,
    object: Optional<XR_game_object | XR_cse_alife_human_abstract>,
    params: [Optional<TStringId>, Optional<TName>, TName]
  ): void => {
    logger.info("Pick artefact from anomaly");

    const anomalyZoneName: Optional<TName> = params && params[1];
    let artefactSection: TSection = params && params[2];

    const anomalyZone = registry.anomalyZones.get(anomalyZoneName as TName);

    if (params && params[0]) {
      const objectId: Optional<TNumberId> = getObjectIdByStoryId(params[0]);

      if (objectId === null) {
        abort("Couldn't relocate item to NULL in function 'pick_artefact_from_anomaly!'");
      }

      object = alife().object<XR_cse_alife_human_abstract>(objectId) as XR_cse_alife_human_abstract;

      if (object && (!isStalker(object) || !object.alive())) {
        abort("Couldn't relocate item to NULL (dead || ! stalker) in function 'pick_artefact_from_anomaly!'");
      }
    }

    if (anomalyZone === null) {
      abort("No such anomal zone in function 'pick_artefact_from_anomaly!'");
    }

    if (anomalyZone.spawnedArtefactsCount < 1) {
      return;
    }

    let artefactId: Optional<TNumberId> = null;
    let artefactObject: Optional<XR_cse_alife_item_artefact> = null;

    for (const [k, v] of anomalyZone.artefactWaysByArtefactId) {
      if (alife().object(tonumber(k)!) && artefactSection === alife().object(tonumber(k)!)!.section_name()) {
        artefactId = tonumber(k)!;
        artefactObject = alife().object(tonumber(k)!);
        break;
      }

      if (artefactSection === null) {
        artefactId = tonumber(k)!;
        artefactObject = alife().object(tonumber(k)!);
        artefactSection = artefactObject!.section_name();
        break;
      }
    }

    if (artefactId === null) {
      return;
    }

    anomalyZone.onArtefactTaken(artefactObject as XR_cse_alife_item_artefact);

    alife().release(artefactObject!, true);
    spawnItemsForObject(object as XR_game_object, artefactSection);
  }
);

/**
 * todo
 */
extern("xr_effects.anomaly_turn_off", (actor: XR_game_object, object: XR_game_object, p: [string]): void => {
  const anomal_zone = registry.anomalyZones.get(p[0]);

  if (anomal_zone === null) {
    abort("No such anomal zone in function 'anomaly_turn_off!'");
  }

  anomal_zone.turn_off();
});

/**
 * todo
 */
extern(
  "xr_effects.anomaly_turn_on",
  (actor: XR_game_object, object: XR_game_object, p: [string, Optional<string>]): void => {
    const anomal_zone = registry.anomalyZones.get(p[0]);

    if (anomal_zone === null) {
      abort("No such anomal zone in function 'anomaly_turn_on!'");
    }

    if (p[1]) {
      anomal_zone.turn_on(true);
    } else {
      anomal_zone.turn_on(false);
    }
  }
);

/**
 * todo;
 */
extern("xr_effects.turn_off_underpass_lamps", (actor: XR_game_object, object: XR_game_object): void => {
  const lamps_table = {
    ["pas_b400_lamp_start_flash"]: true,
    ["pas_b400_lamp_start_red"]: true,
    ["pas_b400_lamp_elevator_green"]: true,
    ["pas_b400_lamp_elevator_flash"]: true,
    ["pas_b400_lamp_elevator_green_1"]: true,
    ["pas_b400_lamp_elevator_flash_1"]: true,
    ["pas_b400_lamp_track_green"]: true,
    ["pas_b400_lamp_track_flash"]: true,
    ["pas_b400_lamp_downstairs_green"]: true,
    ["pas_b400_lamp_downstairs_flash"]: true,
    ["pas_b400_lamp_tunnel_green"]: true,
    ["pas_b400_lamp_tunnel_flash"]: true,
    ["pas_b400_lamp_tunnel_green_1"]: true,
    ["pas_b400_lamp_tunnel_flash_1"]: true,
    ["pas_b400_lamp_control_down_green"]: true,
    ["pas_b400_lamp_control_down_flash"]: true,
    ["pas_b400_lamp_control_up_green"]: true,
    ["pas_b400_lamp_control_up_flash"]: true,
    ["pas_b400_lamp_hall_green"]: true,
    ["pas_b400_lamp_hall_flash"]: true,
    ["pas_b400_lamp_way_green"]: true,
    ["pas_b400_lamp_way_flash"]: true,
  } as unknown as LuaTable<string, boolean>;

  for (const [k, v] of lamps_table) {
    const object: Optional<XR_game_object> = getObjectByStoryId(k);

    if (object) {
      object.get_hanging_lamp().turn_off();
    } else {
      logger.warn("function 'turn_off_underpass_lamps' lamp [%s] does ! exist", tostring(k));
    }
  }
});

/**
 * todo;
 */
extern("xr_effects.turn_off", (actor: XR_game_object, npc: XR_game_object, parameters: LuaArray<TStringId>): void => {
  for (const [index, storyId] of parameters) {
    const object: Optional<XR_game_object> = getObjectByStoryId(storyId);

    if (!object) {
      abort("TURN_OFF. Target object with story_id [%s] does ! exist", storyId);
    }

    object.get_hanging_lamp().turn_off();
  }
});

/**
 * todo;
 */
extern("xr_effects.turn_off_object", (actor: XR_game_object, object: XR_game_object): void => {
  object.get_hanging_lamp().turn_off();
});

/**
 * todo;
 */
extern(
  "xr_effects.turn_on_and_force",
  (actor: XR_game_object, npc: XR_game_object, params: [TStringId, number, number]): void => {
    const object: Optional<XR_game_object> = getObjectByStoryId(params[0]);

    if (!object) {
      abort("TURN_ON_AND_FORCE. Target object does ! exist");

      return;
    }

    if (params[1] === null) {
      params[1] = 55;
    }

    if (params[2] === null) {
      params[2] = 14000;
    }

    object.set_const_force(new vector().set(0, 1, 0), params[1], params[2]);
    object.start_particles("weapons\\light_signal", "link");
    object.get_hanging_lamp().turn_on();
  }
);

/**
 * todo;
 */
extern("xr_effects.turn_off_and_force", (actor: XR_game_object, npc: XR_game_object, p: [TStringId]): void => {
  const object: Optional<XR_game_object> = getObjectByStoryId(p[0]);

  if (!object) {
    abort("TURN_OFF [%s]. Target object does ! exist", npc.name());
  }

  object.stop_particles("weapons\\light_signal", "link");
  object.get_hanging_lamp().turn_off();
});

/**
 * todo;
 */
extern("xr_effects.turn_on_object", (actor: XR_game_object, object: XR_game_object): void => {
  object.get_hanging_lamp().turn_on();
});

/**
 * todo;
 */
extern("xr_effects.turn_on", (actor: XR_game_object, npc: XR_game_object, parameters: LuaArray<TStringId>) => {
  for (const [index, storyId] of parameters) {
    const object: Optional<XR_game_object> = getObjectByStoryId(storyId);

    if (!object) {
      abort("TURN_ON [%s]. Target object does ! exist", npc.name());
    }

    object.get_hanging_lamp().turn_on();
  }
});

/**
 * todo;
 */
extern(
  "xr_effects.set_weather",
  (actor: XR_game_object, object: XR_game_object, [weatherName, isForced]: [TName, string]): void => {
    logger.info("Set weather:", weatherName);

    if (weatherName !== null) {
      level.set_weather(weatherName, isForced === TRUE);
    }
  }
);

/**
 * todo;
 */
extern("xr_effects.start_surge", (): void => {
  logger.info("Start surge");
  SurgeManager.getInstance().requestSurgeStart();
});

/**
 * todo;
 */
extern("xr_effects.stop_surge", (): void => {
  logger.info("Stop surge");
  SurgeManager.getInstance().requestSurgeStop();
});

/**
 * todo;
 */
extern(
  "xr_effects.set_surge_mess_and_task",
  (actor: XR_game_object, npc: XR_game_object, p: [string, Optional<string>]): void => {
    const surgeManager: SurgeManager = SurgeManager.getInstance();

    surgeManager.setSurgeMessage(p[0]);

    if (p[1]) {
      surgeManager.setSurgeTask(p[1]);
    }
  }
);

/**
 * todo;
 */
extern("xr_effects.enable_anomaly", (actor: XR_game_object, npc: XR_game_object, p: [string]) => {
  if (p[0] === null) {
    abort("Story id for enable_anomaly function is ! set");
  }

  const object: Optional<XR_game_object> = getObjectByStoryId(p[0]);

  if (!object) {
    abort("There is no object with story_id %s for enable_anomaly function", tostring(p[0]));
  }

  object.enable_anomaly();
});

/**
 * todo;
 */
extern("xr_effects.disable_anomaly", (actor: XR_game_object, npc: XR_game_object, p: [TStringId]): void => {
  if (p[0] === null) {
    abort("Story id for disable_anomaly function is ! set");
  }

  const object: Optional<XR_game_object> = getObjectByStoryId(p[0]);

  if (!object) {
    abort("There is no object with story_id %s for disable_anomaly function", tostring(p[0]));
  }

  object.disable_anomaly();
});

/**
 * todo;
 */
extern("xr_effects.launch_signal_rocket", (actor: XR_game_object, obj: XR_game_object, p: [string]): void => {
  if (p === null) {
    abort("Signal rocket name is ! set!");
  }

  if (registry.signalLights.get(p[0]) !== null) {
    registry.signalLights.get(p[0]).launch();
  } else {
    abort("No such signal rocket. [%s] on level", tostring(p[0]));
  }
});

/**
 * todo;
 */
extern(
  "xr_effects.create_cutscene_actor_with_weapon",
  (
    first: XR_game_object,
    second: XR_game_object,
    params: [Optional<string>, Optional<string>, number, number, number]
  ): void => {
    logger.info("Create cutscene actor with weapon");

    const spawn_sect: Optional<string> = params[0];

    if (spawn_sect === null) {
      abort("Wrong spawn section for 'spawn_object' function %s. For object %s", tostring(spawn_sect), second.name());
    }

    const path_name = params[1];

    if (path_name === null) {
      abort("Wrong path_name for 'spawn_object' function %s. For object %s", tostring(path_name), second.name());
    }

    if (!level.patrol_path_exists(path_name)) {
      abort("Path %s doesnt exist. Function 'spawn_object' for object %s ", tostring(path_name), second.name());
    }

    const ptr = new patrol(path_name);
    const index = params[2] || 0;
    const yaw = params[3] || 0;

    const npc = alife().create(spawn_sect, ptr.point(index), ptr.level_vertex_id(0), ptr.game_vertex_id(0))!;

    if (isStalker(npc)) {
      npc.o_torso()!.yaw = (yaw * math.pi) / 180;
    } else {
      npc.angle.y = (yaw * math.pi) / 180;
    }

    const slot_override = params[4] || 0;

    const actor: XR_game_object = registry.actor;
    let slot: number;
    let active_item: Optional<XR_game_object> = null;

    if (slot_override === 0) {
      slot = actor.active_slot();
      if (slot !== 2 && slot !== 3) {
        return;
      }

      active_item = actor.active_item();
    } else {
      if (actor.item_in_slot(slot_override) !== null) {
        active_item = actor.item_in_slot(slot_override);
      } else {
        if (actor.item_in_slot(3) !== null) {
          active_item = actor.item_in_slot(3);
        } else if (actor.item_in_slot(2) !== null) {
          active_item = actor.item_in_slot(2);
        } else {
          return;
        }
      }
    }

    const actor_weapon = alife().object(active_item!.id()) as XR_cse_alife_item_weapon;
    let section_name = actor_weapon.section_name();

    if (section_name === quest_items.pri_a17_gauss_rifle) {
      section_name = weapons.wpn_gauss;
    }

    if (active_item) {
      const new_weapon = alife().create<XR_cse_alife_item_weapon>(
        section_name,
        ptr.point(index),
        ptr.level_vertex_id(0),
        ptr.game_vertex_id(0),
        npc.id
      );

      if (section_name !== weapons.wpn_gauss) {
        new_weapon.clone_addons(actor_weapon);
      }
    }
  }
);

/**
 * todo;
 */
extern("xr_effects.stop_sr_cutscene", (actor: XR_game_object, npc: XR_game_object, parameters: []) => {
  const state: IRegistryObjectState = registry.objects.get(npc.id());

  if (state.active_scheme !== null) {
    state[state.active_scheme]!.signals!.set("cam_effector_stop", true);
  }
});