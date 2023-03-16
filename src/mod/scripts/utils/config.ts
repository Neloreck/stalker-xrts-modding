import { alife, XR_alife_simulator, XR_cse_abstract, XR_cse_alife_object, XR_game_object, XR_ini_file } from "xray16";

import {
  AnyCallablesModule,
  AnyObject,
  EScheme,
  ESchemeCondition,
  LuaArray,
  Optional,
  TIndex,
  TName,
  TRate,
  TSection,
  TStringId,
} from "@/mod/lib/types";
import { IRegistryObjectState, registry } from "@/mod/scripts/core/database";
import { IBaseSchemeLogic } from "@/mod/scripts/core/scheme/base";
import { abort } from "@/mod/scripts/utils/debug";
import { disableInfo, hasAlifeInfo } from "@/mod/scripts/utils/info_portion";
import { LuaLogger } from "@/mod/scripts/utils/logging";
import { parseConditionsList, parseNames, parseParameters, TConditionList } from "@/mod/scripts/utils/parse";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo: Description
 * todo: Add signature with null if default is not provided.
 */
export function getConfigString<D = string>(
  ini: XR_ini_file,
  section: Optional<TSection>,
  field: TName,
  object: Optional<XR_cse_abstract | XR_game_object | AnyObject>,
  mandatory: boolean,
  prefix: Optional<string> | false,
  defaultVal?: D
): string | D {
  if (mandatory === null || prefix === null) {
    abort("section '%s': wrong arguments order in call to cfg_get_string", section);
  }

  // todo: Resolve prefix.
  if (section && ini.section_exist(section) && ini.line_exist(section, field)) {
    if (prefix && prefix !== "") {
      return prefix + "_" + ini.r_string(section, field);
    } else {
      return ini.r_string(section, field);
    }
  }

  if (!mandatory) {
    return defaultVal as string;
  }

  return abort("'Attempt to read a non-existent string field '" + field + "' in section '" + section + "'") as never;
}

/**
 * todo;
 */
export function getConfigNumber<T = number>(
  ini: XR_ini_file,
  section: TSection,
  field: TName,
  object: Optional<AnyObject>,
  mandatory: boolean,
  defaultVal?: T
): number | T {
  if (mandatory === null) {
    abort("section '%s': wrong arguments order in call to cfg_get_number", section);
  }

  if (section && ini.section_exist(section) && ini.line_exist(section, field)) {
    return ini.r_float(section, field);
  }

  if (!mandatory) {
    return defaultVal as number;
  }

  return null as any;
}

/**
 * todo; cfg_get_bool
 */
export function getConfigBoolean(
  char_ini: XR_ini_file,
  section: Optional<TSection>,
  field: TName,
  object: Optional<XR_game_object | XR_cse_alife_object>,
  mandatory: boolean,
  default_val?: boolean
): boolean {
  if (mandatory === null) {
    abort("section '%s': wrong arguments order in call to cfg_get_bool", section);
  }

  if (section && char_ini.section_exist(section) && char_ini.line_exist(section, field)) {
    return char_ini.r_bool(section, field);
  }

  if (!mandatory) {
    if (default_val !== undefined) {
      return default_val;
    }

    return false;
  }

  abort(
    "Object '%s': attempt to read a non-existent boolean field '%s' in section '%s'",
    object?.name(),
    field,
    section
  );
}

/**
 * todo;
 */
export function getParamString(data: string, obj: XR_game_object): LuaMultiReturn<[string, boolean]> {
  const scriptId = registry.scriptSpawned.get(obj.id());
  const [outString, num] = string.gsub(data, "%$script_id%$", tostring(scriptId));

  if (num > 0) {
    return $multi(outString, true);
  } else {
    return $multi(data, false);
  }
}

/**
 * todo: Casting verification.
 */
export function read2nums(
  spawn_ini: XR_ini_file,
  section: Optional<TName>,
  line: TName,
  default1: number,
  default2: number
): LuaMultiReturn<[number, number]> {
  if (spawn_ini.line_exist(section, line)) {
    const t = parseNames(spawn_ini.r_string(section as TName, line));
    const n = t.length();

    if (n === 0) {
      return $multi(default1, default2);
    } else if (n === 1) {
      return $multi(t.get(1) as any, default2);
    } else {
      return $multi(t.get(1) as any, t.get(2) as any);
    }
  } else {
    return $multi(default1, default2);
  }
}

/**
 * todo;
 */

/**
 * todo;
 */
export function getInfosFromData(object: XR_game_object, data: Optional<string>): LuaArray<string> {
  const infos: LuaArray<string> = new LuaTable();
  const actor: XR_game_object = registry.actor;

  if (data !== null) {
    for (const name of string.gfind(data, "(%|*[^%|]+%|*)%p*")) {
      const condlist = parseConditionsList(object, "in", name, name);

      if (condlist !== null) {
        table.insert(infos, pickSectionFromCondList(actor, object, condlist)!);
      }
    }
  }

  return infos;
}

/**
 * @returns picked section based on condlist.
 */
export function pickSectionFromCondList<T extends TSection>(
  actor: XR_game_object,
  object: Optional<XR_game_object | XR_cse_alife_object>,
  condlist: TConditionList
): Optional<T> {
  let randomValue: Optional<TRate> = null; // -- math.random(100)
  let infop_conditions_met;

  for (const [n, cond] of condlist) {
    infop_conditions_met = true;
    for (const [inum, infop] of pairs(cond.infop_check)) {
      if (infop.prob) {
        if (!randomValue) {
          randomValue = math.random(100);
        }

        if (infop.prob < randomValue) {
          infop_conditions_met = false;
          break;
        }
      } else if (infop.func) {
        if (!get_global<AnyCallablesModule>("xr_conditions")[infop.func]) {
          abort(
            "object '%s': pick_section_from_condlist: function '%s' is " + "not defined in xr_conditions.script",
            object?.name(),
            infop.func
          );
        }

        if (infop.params) {
          if (get_global<AnyCallablesModule>("xr_conditions")[infop.func](actor, object, infop.params)) {
            if (!infop.expected) {
              infop_conditions_met = false;
              break;
            }
          } else {
            if (infop.expected) {
              infop_conditions_met = false;
              break;
            }
          }
        } else {
          if (get_global<AnyCallablesModule>("xr_conditions")[infop.func](actor, object)) {
            if (!infop.expected) {
              infop_conditions_met = false;
              break;
            }
          } else {
            if (infop.expected) {
              infop_conditions_met = false;
              break;
            }
          }
        }
      } else if (hasAlifeInfo(infop.name as TStringId)) {
        if (!infop.required) {
          infop_conditions_met = false;
          break;
        } else {
          // -
        }
      } else {
        if (infop.required) {
          infop_conditions_met = false;
          break;
        } else {
          // -
        }
      }
    }

    if (infop_conditions_met) {
      for (const [inum, infop] of pairs(cond.infop_set)) {
        if (actor === null) {
          abort("TRYING TO SET INFOS THEN ACTOR IS NIL");
        }

        if (infop.func) {
          if (!get_global<AnyCallablesModule>("xr_effects")[infop.func]) {
            abort(
              "object '%s': pick_section_from_condlist: function '%s' is " + "not defined in xr_effects.script",
              object?.name(),
              infop.func
            );
          }

          if (infop.params) {
            get_global<AnyCallablesModule>("xr_effects")[infop.func](actor, object, infop.params);
          } else {
            get_global<AnyCallablesModule>("xr_effects")[infop.func](actor, object);
          }
        } else if (infop.required) {
          if (!hasAlifeInfo(infop.name as TStringId)) {
            actor.give_info_portion(infop.name as TStringId);
          }
        } else {
          if (hasAlifeInfo(infop.name as TStringId)) {
            disableInfo(infop.name as TStringId);
          }
        }
      }

      if (cond.section === "never") {
        return null;
      } else {
        return cond.section as T;
      }
    }
  }

  return null;
}

/**
 * todo
 */
export function getConfigConditionList(
  ini: XR_ini_file,
  section: TSection,
  field: TName,
  object: XR_game_object
): Optional<IBaseSchemeLogic> {
  const data: Optional<string> = getConfigString(ini, section, field, object, false, "");

  if (!data) {
    return null;
  }

  const parameters: LuaArray<string> = parseParameters(data);

  if (!parameters.get(1)) {
    abort("Invalid syntax in condlist");
  }

  return {
    name: field,
    condlist: parseConditionsList(object, section, field, parameters.get(1)),
    npc_id: null,
    v1: null,
    v2: null,
  };
}

/**
 * todo;
 */
export function getConfigStringAndCondList(
  ini: XR_ini_file,
  section: TSection,
  field: TName,
  object: XR_game_object
): Optional<IBaseSchemeLogic> {
  const data: string = getConfigString(ini, section, field, object, false, "");

  if (!data) {
    return null;
  }

  const parameters: LuaArray<string> = parseParameters(data);

  if (!parameters.get(1) || !parameters.get(2)) {
    abort("Invalid syntax in condlist");
  }

  return {
    name: field,
    condlist: parseConditionsList(object, section, field, parameters.get(2)),
    npc_id: null,
    v1: parameters.get(1),
    v2: null,
  };
}

/**
 * todo
 * todo
 * todo
 * todo
 */
export function getConfigNumberAndConditionList(
  ini: XR_ini_file,
  section: TSection,
  field: TName,
  object: XR_game_object
): Optional<IBaseSchemeLogic> {
  const data: Optional<string> = getConfigString(ini, section, field, object, false, "");

  if (!data) {
    return null;
  }

  const params: LuaArray<string> = parseParameters(data);

  if (!params.get(1) || !params.get(2)) {
    abort("Invalid condlist: %s", data);
  }

  return {
    name: field,
    v1: tonumber(params.get(1))!,
    condlist: parseConditionsList(object, section, field, params.get(2)),
    npc_id: null,
    v2: null,
  };
}

/** *
 * todo
 * todo
 * todo
 */
export function getConfigStringAndConditionList(
  ini: XR_ini_file,
  section: TSection,
  field: TName,
  object: XR_game_object
): Optional<IBaseSchemeLogic> {
  const data: Optional<string> = getConfigString(ini, section, field, object, false, "");

  if (!data) {
    return null;
  }

  const parameters: LuaArray<string> = parseParameters(data);

  if (!parameters.get(1) || !parameters.get(2)) {
    abort("Invalid condlist: %s, %s", field, section);
  }

  return {
    name: field,
    condlist: parseConditionsList(object, section, field, parameters.get(2)),
    npc_id: null,
    v1: parameters.get(1),
    v2: null,
  };
}

/**
 * todo
 * todo
 * todo
 */
export function getConfigTwoStringsAndConditionsList(
  ini: XR_ini_file,
  section: TSection,
  field: TName,
  object: XR_game_object
): Optional<IBaseSchemeLogic> {
  const data: string = getConfigString(ini, section, field, object, false, "");

  if (!data) {
    return null;
  }

  const par = parseParameters(data);

  if (!par.get(1) || !par.get(2) || !par.get(3)) {
    abort("Invalid condlist: %s, %s", field, section);
  }

  return {
    name: field,
    condlist: parseConditionsList(object, section, field, par.get(3)),
    npc_id: null,
    v1: par.get(1),
    v2: par.get(2),
  };
}

/**
 * todo
 * todo
 * todo
 */
export function getConfigSwitchConditions(
  ini: XR_ini_file,
  section: TSection,
  object: XR_game_object
): Optional<LuaArray<IBaseSchemeLogic>> {
  const conditionsList: LuaArray<IBaseSchemeLogic> = new LuaTable();
  let index: TIndex = 1;

  if (!ini.section_exist(tostring(section))) {
    return null;
  }

  const line_count = ini.line_count(section);

  function add_conditions(
    func: (ini: XR_ini_file, section: TSection, id: TStringId, npc: XR_game_object) => Optional<IBaseSchemeLogic>,
    cond: ESchemeCondition
  ) {
    for (const line_number of $range(0, line_count - 1)) {
      const [result, id, value] = ini.r_line(section, line_number, "", "");
      const [search_index] = string.find(id, "^" + cond + "%d*$");

      if (search_index !== null) {
        index = addCondition(conditionsList, index, func(ini, section, id, object));
      }
    }
  }

  // todo: Move conditions to enum.
  add_conditions(getConfigNumberAndConditionList, ESchemeCondition.ON_ACTOR_DISTANCE_LESS_THAN);
  add_conditions(getConfigNumberAndConditionList, ESchemeCondition.ON_ACTOR_DISTANCE_LESS_THAN_AND_VISIBLE);
  add_conditions(getConfigNumberAndConditionList, ESchemeCondition.ON_ACTOR_DISTANCE_GREATER_THAN);
  add_conditions(getConfigNumberAndConditionList, ESchemeCondition.ON_ACTOR_DISTANCE_GREATER_THAN_AND_VISIBLE);
  add_conditions(getConfigStringAndConditionList, ESchemeCondition.ON_SIGNAL);
  add_conditions(getConfigConditionList, ESchemeCondition.ON_INFO);
  add_conditions(getConfigNumberAndConditionList, ESchemeCondition.ON_TIMER);
  add_conditions(getConfigNumberAndConditionList, ESchemeCondition.ON_GAME_TIMER);
  add_conditions(getConfigStringAndConditionList, ESchemeCondition.ON_ACTOR_IN_ZONE);
  add_conditions(getConfigStringAndConditionList, ESchemeCondition.ON_ACTOR_NOT_IN_ZONE);
  add_conditions(getConfigConditionList, ESchemeCondition.ON_ACTOR_INSIDE);
  add_conditions(getConfigConditionList, ESchemeCondition.ON_ACTOR_OUTSIDE);
  add_conditions(getConfigObjectAndZone, ESchemeCondition.ON_NPC_IN_ZONE);
  add_conditions(getConfigObjectAndZone, ESchemeCondition.ON_NPC_NOT_IN_ZONE);

  return conditionsList;
}

/**
 * todo;
 * todo;
 * todo;
 */
export function addCondition(
  conditionsList: LuaArray<IBaseSchemeLogic>,
  at: TIndex,
  conditions: Optional<IBaseSchemeLogic>
): TIndex {
  if (conditions) {
    conditionsList.set(at, conditions);

    return at + 1;
  }

  return at;
}

/**
 * todo;
 * todo;
 * todo;
 */
export function getConfigObjectAndZone(
  ini: XR_ini_file,
  section: TSection,
  field: TName,
  object: XR_game_object
): Optional<IBaseSchemeLogic> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getStoryObjectId } = require("@/mod/scripts/utils/id");
  const target: Optional<IBaseSchemeLogic> = getConfigTwoStringsAndConditionsList(ini, section, field, object);

  if (target !== null) {
    const simulator: Optional<XR_alife_simulator> = alife();

    if (simulator !== null) {
      const serverObject: Optional<XR_cse_alife_object> = simulator.object(getStoryObjectId(target.v1)!);

      if (serverObject) {
        target.npc_id = serverObject.id;
      } else {
        abort(
          "object '%s': section '%s': field '%s': there is no object with story_id '%s'",
          object.name(),
          section,
          field,
          target.v1
        );
      }
    } else {
      target.npc_id = -1;
    }
  }

  return target;
}

/**
 * todo;
 * todo;
 * todo;
 * todo;
 */
export function getConfigOverrides(ini: XR_ini_file, section: TSection, object: XR_game_object) {
  const overrides: AnyObject = {};
  const heliHunter: Optional<string> = getConfigString(ini, section, "heli_hunter", object, false, "");

  if (heliHunter !== null) {
    overrides.heli_hunter = parseConditionsList(object, section, "heli_hunter", heliHunter);
  }

  overrides.combat_ignore = getConfigConditionList(ini, section, "combat_ignore_cond", object);
  overrides.combat_ignore_keep_when_attacked = getConfigBoolean(
    ini,
    section,
    "combat_ignore_keep_when_attacked",
    object,
    false
  );
  overrides.combat_type = getConfigConditionList(ini, section, "combat_type", object);
  overrides.on_combat = getConfigConditionList(ini, section, "on_combat", object);

  const state: IRegistryObjectState = registry.objects.get(object.id());

  if (ini.line_exist(state.section_logic, "post_combat_time")) {
    const [min_post_combat_time, max_post_combat_time] = read2nums(
      ini,
      state.section_logic,
      "post_combat_time",
      10,
      15
    );

    overrides.min_post_combat_time = min_post_combat_time;
    overrides.max_post_combat_time = max_post_combat_time;
  } else {
    const [min_post_combat_time, max_post_combat_time] = read2nums(ini, section, "post_combat_time", 10, 15);

    overrides.min_post_combat_time = min_post_combat_time;
    overrides.max_post_combat_time = max_post_combat_time;
  }

  if (ini.line_exist(section, "on_offline")) {
    overrides.on_offline_condlist = parseConditionsList(
      object,
      section,
      "on_offline",
      getConfigString(ini, section, "on_offline", object, false, "", "nil")
    );
  } else {
    overrides.on_offline_condlist = parseConditionsList(
      object,
      state.section_logic,
      "on_offline",
      getConfigString(ini, state.section_logic, "on_offline", object, false, "", "nil")
    );
  }

  overrides.soundgroup = getConfigString(ini, section, "soundgroup", object, false, "");

  return overrides;
}

/**
 * todo
 * todo
 * todo
 */
export function getSchemeBySection(section: TSection): EScheme {
  const [scheme] = string.gsub(section, "%d", "");
  const [at, to] = string.find(scheme, "@", 1, true);

  if (at !== null && to !== null) {
    return string.sub(scheme, 1, at - 1) as EScheme;
  }

  return scheme as EScheme;
}