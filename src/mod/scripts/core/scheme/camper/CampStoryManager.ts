import { time_global, XR_game_object, XR_ini_file, XR_vector } from "xray16";

import { EScheme, LuaArray, Optional, TCount, TName, TNumberId } from "@/mod/lib/types";
import { IRegistryObjectState, registry } from "@/mod/scripts/core/database";
import { GlobalSoundManager } from "@/mod/scripts/core/manager/GlobalSoundManager";
import { IAnimpointAction, ISchemeAnimpointState } from "@/mod/scripts/core/scheme/animpoint/ISchemeAnimpointState";
import { ESchemeEvent } from "@/mod/scripts/core/scheme/base";
import { issueSchemeEvent } from "@/mod/scripts/core/scheme/issueSchemeEvent";
import { ISchemeMeetState } from "@/mod/scripts/core/scheme/meet";
import { MeetManager } from "@/mod/scripts/core/scheme/meet/MeetManager";
import { get_sound_manager, SoundManager } from "@/mod/scripts/core/sound/SoundManager";
import { isObjectMeeting } from "@/mod/scripts/utils/check/check";
import { getConfigString } from "@/mod/scripts/utils/config";
import { abort } from "@/mod/scripts/utils/debug";
import { LuaLogger } from "@/mod/scripts/utils/logging";
import { parseNames } from "@/mod/scripts/utils/parse";

const logger: LuaLogger = new LuaLogger($filename);
const E_NPC_ROLE = { noone: 0, listener: 1, director: 2 };

// todo: Implement as scheme.
// todo: Rename to camp story?
// todo: Move?
export class CampStoryManager {
  public static readonly SCHEME_SECTION: EScheme = EScheme.CAMP;

  /**
   * todo;
   */
  public static get_current_camp(position: Optional<XR_vector>): Optional<CampStoryManager> {
    if (position === null) {
      return null;
    }

    // todo: Is it too big scope to check?
    for (const [k, v] of registry.camps.stories) {
      if (v.object!.inside(position)) {
        return v;
      }
    }

    return null;
  }

  /**
   * todo;
   */
  public static start_guitar(npc: XR_game_object): void {
    const camp_id = registry.objects.get(npc.id()).registred_camp;

    if (camp_id === null) {
      return;
    }

    const camp = registry.camps.stories.get(camp_id);

    camp.sound_manager.set_storyteller(camp.director);
    camp.sound_manager.set_story(camp.guitar_table.get(math.random(camp.guitar_table.length())));
    camp.sound_manager_started = true;
    camp.sound_manager.update();
  }

  /**
   * todo;
   */
  public static start_harmonica(object: XR_game_object): void {
    const capmId = registry.objects.get(object.id()).registred_camp;

    if (capmId === null) {
      return;
    }

    const camp = registry.camps.stories.get(capmId);

    camp.sound_manager.set_storyteller(camp.director);
    camp.sound_manager.set_story(camp.harmonica_table.get(math.random(camp.harmonica_table.length())));
    camp.sound_manager_started = true;
    camp.sound_manager.update();
  }

  public object: XR_game_object;
  public ini: XR_ini_file;

  public story_table: LuaTable<number, string>;
  public guitar_table: LuaTable<number, string>;
  public harmonica_table: LuaTable<number, string>;

  public npc: LuaTable<number, { [index: string]: number | string; state: string }> = new LuaTable();
  public schemes: LuaTable = new LuaTable();

  public director: Optional<number> = null;
  public idle_talker: Optional<number> = null;

  public sound_manager_started: boolean = true;
  public sound_manager: SoundManager;

  public active_state: string = "idle";
  public active_state_time: number = 0;
  public timeout: number = 0;
  public states: LuaTable<
    string,
    {
      director_state: Optional<string>;
      general_state: string;
      min_time: number;
      max_time: number;
      timeout: number;
      transitions: LuaTable<string, number>;
      precondition: (this: void, camp: CampStoryManager) => boolean;
    }
  >;

  /**
   * todo;
   */
  public constructor(object: XR_game_object, ini: XR_ini_file) {
    this.object = object;
    this.ini = ini;

    const stories = getConfigString(ini, CampStoryManager.SCHEME_SECTION, "stories", null, false, "", "test_story");
    const guitars = getConfigString(
      ini,
      CampStoryManager.SCHEME_SECTION,
      "guitar_themes",
      null,
      false,
      "",
      "test_guitar"
    );
    const harmonicas = getConfigString(
      ini,
      CampStoryManager.SCHEME_SECTION,
      "harmonica_themes",
      null,
      false,
      "",
      "test_harmonica"
    );

    this.story_table = parseNames(stories);
    this.guitar_table = parseNames(guitars);
    this.harmonica_table = parseNames(harmonicas);

    this.sound_manager = get_sound_manager(CampStoryManager.SCHEME_SECTION + this.object.id());

    this.states = {
      idle: {
        director_state: null,
        general_state: "idle",
        min_time: 30000,
        max_time: 40000,
        timeout: 0,
        transitions: { harmonica: 30, guitar: 30, story: 40 },
        precondition: sr_camp_idle_precondition,
      },
      harmonica: {
        director_state: "play_harmonica",
        general_state: "listen",
        min_time: 10000,
        max_time: 11000,
        timeout: 3000,
        transitions: { idle: 100, harmonica: 0, guitar: 0, story: 0 },
        precondition: sr_camp_harmonica_precondition,
      },
      guitar: {
        director_state: "play_guitar",
        general_state: "listen",
        min_time: 10000,
        max_time: 11000,
        timeout: 4500,
        transitions: { idle: 100, harmonica: 0, guitar: 0, story: 0 },
        precondition: sr_camp_guitar_precondition,
      },
      story: {
        director_state: "tell",
        general_state: "listen",
        min_time: 10000,
        max_time: 11000,
        timeout: 0,
        transitions: { idle: 100, harmonica: 0, guitar: 0, story: 0 },
        precondition: sr_camp_story_precondition,
      },
    } as any;
  }

  /**
   * todo;
   */
  public update(): void {
    if (!this.sound_manager.is_finished()) {
      this.sound_manager.update();

      return;
    }

    if (!this.sound_manager_started) {
      return;
    }

    if (this.idle_talker !== null) {
      if (registry.sounds.generic.get(this.idle_talker) !== null) {
        return;
      } else {
        this.idle_talker = null;
      }
    }

    if (this.active_state_time < time_global()) {
      this.set_next_state();
      if (this.get_director() === false) {
        this.active_state = "idle";
        for (const [k, v] of this.npc) {
          v.state = this.active_state;
        }
      }

      this.sound_manager_started = false;

      for (const [k, v] of this.npc) {
        if (registry.objects.get(k) !== null) {
          // todo: Optimize call.
          issueSchemeEvent(
            registry.objects.get(k).object!,
            registry.objects.get(k)[registry.objects.get(k).active_scheme!]!,
            ESchemeEvent.UPDATE
          );
        }

        const meet: Optional<MeetManager> = (registry.objects.get(k)[EScheme.MEET] as ISchemeMeetState)?.meet_manager;

        if (meet !== null) {
          meet.npc_is_camp_director = this.director === k;
        }
      }
    }

    if (this.timeout !== 0 && this.timeout <= time_global()) {
      this.set_story();
      this.timeout = 0;
    }

    if (this.active_state === "idle") {
      let npc_count: number = 0;
      const talkers: LuaTable<number, number> = new LuaTable();

      for (const [k, v] of this.npc) {
        npc_count = npc_count + 1;
        table.insert(talkers, k);
      }

      if (npc_count !== 0) {
        this.idle_talker = talkers.get(math.random(talkers.length()));
        GlobalSoundManager.getInstance().setSoundPlaying(this.idle_talker, "state", null, null);
      }
    }
  }

  /**
   * todo;
   */
  public set_next_state(): void {
    const transitions = this.states.get(this.active_state).transitions;
    let rnd: number = math.random(100);

    for (const [k, v] of transitions) {
      if (rnd < v) {
        if (this.states.get(k).precondition(this)) {
          this.active_state = k;
          break;
        }
      } else {
        rnd = rnd - v;
      }
    }

    for (const [k, v] of this.npc) {
      v.state = this.active_state;
    }

    this.active_state_time =
      time_global() +
      math.random(this.states.get(this.active_state).min_time, this.states.get(this.active_state).max_time);
    this.timeout = time_global() + this.states.get(this.active_state).timeout;
  }

  /**
   * todo;
   */
  public get_director(): Optional<boolean> {
    if (this.active_state === "idle") {
      this.director = null;

      return null;
    }

    const directors = new LuaTable();
    let objectsCount: TCount = 0;

    for (const [id, info] of this.npc) {
      objectsCount = objectsCount + 1;

      const state = registry.objects.get(id);

      if (state !== null) {
        const schemeState: Optional<ISchemeAnimpointState> =
          state.active_scheme && (state[state.active_scheme] as ISchemeAnimpointState);
        const object: Optional<XR_game_object> = state.object;

        if (
          info[this.active_state] === E_NPC_ROLE.director &&
          schemeState !== null &&
          schemeState.base_action === schemeState.description &&
          !isObjectMeeting(object)
        ) {
          table.insert(directors, id);
        }
      }
    }

    if (objectsCount === 0) {
      this.director = null;
    } else if (directors.length() < 1) {
      return false;
    } else if (directors.length() === 1) {
      this.director = directors.get(1);
    } else {
      this.director = directors.get(math.random(directors.length()));
    }

    return null;
  }

  /**
   * todo;
   */
  public set_story(): void {
    if (this.active_state === "story") {
      this.sound_manager.set_storyteller(this.director);
      this.sound_manager.set_story(this.story_table.get(math.random(this.story_table.length())));
      this.sound_manager_started = true;
    } else if (this.active_state === "idle") {
      this.sound_manager_started = true;
    }
  }

  /**
   * todo;
   */
  public get_camp_action(npc_id: number): LuaMultiReturn<[Optional<string>, Optional<boolean>]> {
    if (npc_id === null) {
      abort("Trying to use destroyed object!");
    }

    if (this.npc.get(npc_id) === null) {
      return $multi(null, null);
    }

    return $multi(this.npc.get(npc_id)!.state, this.director === npc_id);
  }

  /**
   * todo;
   */
  public register_npc(objectId: TNumberId): void {
    this.npc.set(objectId, { state: this.active_state });

    const state: IRegistryObjectState = registry.objects.get(objectId);

    state.registred_camp = this.object.id();

    for (const [k, v] of this.states) {
      const role = this.get_npc_role(objectId, k);

      if (role === E_NPC_ROLE.noone) {
        abort("Wrong role for npc[%s] with id[%d] in camp [%s]!!!", "", objectId, this.object.name());
      }

      this.npc.get(objectId)[k] = role;
    }

    this.sound_manager.register_npc(objectId);

    issueSchemeEvent(state.object!, state[state.active_scheme!]!, ESchemeEvent.UPDATE);
  }

  /**
   * todo;
   */
  public unregister_npc(objectId: TNumberId): void {
    if (this.director === objectId) {
      this.sound_manager_started = false;
      this.active_state_time = 0;
      this.director = null;

      this.active_state = "idle";
      for (const [k, v] of this.npc) {
        v.state = this.active_state;
      }
    }

    registry.objects.get(objectId).registred_camp = null;
    this.npc.delete(objectId);
    this.sound_manager.unregister_npc(objectId);
  }

  /**
   * todo;
   */
  public get_npc_role(objectId: TNumberId, state: TName): number {
    const schemeState: Optional<ISchemeAnimpointState> = registry.objects.get(objectId)[
      registry.objects.get(objectId).active_scheme!
    ] as ISchemeAnimpointState;

    if (schemeState === null) {
      return E_NPC_ROLE.noone;
    }

    const objectActions: LuaArray<IAnimpointAction> = schemeState.approved_actions;
    let description: Optional<TName> = schemeState.description;

    if (state === "harmonica" || state === "guitar") {
      description = description + "_" + state;

      for (const i of $range(1, objectActions.length())) {
        if (objectActions.get(i).name === description) {
          return E_NPC_ROLE.director;
        }
      }

      return E_NPC_ROLE.listener;
    } else if (state === "story") {
      for (const i of $range(1, objectActions.length())) {
        if (objectActions.get(i).name === description || objectActions.get(i).name === description + "_weapon") {
          return E_NPC_ROLE.director;
        }
      }

      return E_NPC_ROLE.listener;
    } else if (state === "idle") {
      return E_NPC_ROLE.listener;
    }

    return E_NPC_ROLE.noone;
  }
}

/**
 * todo;
 */
function sr_camp_idle_precondition(camp: CampStoryManager): boolean {
  return true;
}

/**
 * todo;
 */
function sr_camp_guitar_precondition(campStoryManager: CampStoryManager): boolean {
  if (campStoryManager.guitar_table.length() > 0) {
    let count: TCount = 0;

    for (const [k, v] of campStoryManager.npc) {
      count = count + 1;
    }

    if (count > 1) {
      for (const [objectId, objectInfo] of campStoryManager.npc) {
        const state: Optional<IRegistryObjectState> = registry.objects.get(objectId);
        const schemeState: Optional<ISchemeAnimpointState> = state?.active_scheme
          ? (state[state.active_scheme] as ISchemeAnimpointState)
          : null;
        const object: Optional<XR_game_object> = state?.object;

        if (
          objectInfo.guitar === E_NPC_ROLE.director &&
          schemeState !== null &&
          schemeState.base_action === schemeState.description &&
          object !== null &&
          !isObjectMeeting(object)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * todo;
 */
function sr_camp_story_precondition(campStoryManager: CampStoryManager): boolean {
  if (campStoryManager.story_table.length() > 0) {
    let count: TCount = 0;

    for (const [k, v] of campStoryManager.npc) {
      const object: Optional<XR_game_object> = registry.objects.get(k)?.object;

      if (object !== null && !isObjectMeeting(object)) {
        count = count + 1;
      }
    }

    // todo: Probably just return instead of full FOR?
    if (count > 1) {
      return true;
    }
  }

  return false;
}

/**
 * todo;
 */
function sr_camp_harmonica_precondition(campStoryManager: CampStoryManager): boolean {
  if (campStoryManager.harmonica_table.length() > 0) {
    let count: TCount = 0;

    // todo: Len util.
    for (const [k, v] of campStoryManager.npc) {
      count = count + 1;
    }

    if (count > 1) {
      for (const [id, info] of campStoryManager.npc) {
        const state: Optional<IRegistryObjectState> = registry.objects.get(id);
        const schemeState: Optional<ISchemeAnimpointState> = state?.active_scheme
          ? (state[state.active_scheme!] as ISchemeAnimpointState)
          : null;
        const object: Optional<XR_game_object> = state?.object;

        if (
          info.harmonica === E_NPC_ROLE.director &&
          schemeState !== null &&
          schemeState.base_action === schemeState.description &&
          object !== null &&
          !isObjectMeeting(object)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}