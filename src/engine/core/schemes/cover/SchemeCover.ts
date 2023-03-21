import { stalker_ids, world_property, XR_action_planner, XR_game_object, XR_ini_file } from "xray16";

import { AbstractScheme, action_ids, evaluators_id } from "@/engine/core/schemes/base";
import { ActionBaseCover } from "@/engine/core/schemes/cover/actions";
import { EvaluatorNeedCover } from "@/engine/core/schemes/cover/evaluators";
import { ISchemeCoverState } from "@/engine/core/schemes/cover/ISchemeCoverState";
import { subscribeActionForEvents } from "@/engine/core/schemes/subscribeActionForEvents";
import { abort } from "@/engine/core/utils/debug";
import { getConfigSwitchConditions } from "@/engine/core/utils/ini/config";
import { getConfigBoolean, getConfigNumber, getConfigString } from "@/engine/core/utils/ini/getters";
import { LuaLogger } from "@/engine/core/utils/logging";
import { parseConditionsList } from "@/engine/core/utils/parse";
import { EScheme, ESchemeType, TSection } from "@/engine/lib/types";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
export class SchemeCover extends AbstractScheme {
  public static override readonly SCHEME_SECTION: EScheme = EScheme.COVER;
  public static override readonly SCHEME_TYPE: ESchemeType = ESchemeType.STALKER;

  /**
   * todo: Description.
   */
  public static override addToBinder(
    object: XR_game_object,
    ini: XR_ini_file,
    scheme: EScheme,
    section: TSection,
    state: ISchemeCoverState
  ): void {
    const operators = {
      action_cover: action_ids.stohe_cover_base + 1,
    };
    const properties = {
      event: evaluators_id.reaction,
      need_cover: evaluators_id.stohe_cover_base + 1,
      state_mgr_logic_active: evaluators_id.state_mgr + 4,
    };

    const actionPlanner: XR_action_planner = object.motivation_action_manager();

    actionPlanner.add_evaluator(properties.need_cover, new EvaluatorNeedCover(state));

    const new_action: ActionBaseCover = new ActionBaseCover(state);

    new_action.add_precondition(new world_property(stalker_ids.property_alive, true));
    new_action.add_precondition(new world_property(stalker_ids.property_danger, false));
    new_action.add_precondition(new world_property(stalker_ids.property_enemy, false));
    new_action.add_precondition(new world_property(stalker_ids.property_anomaly, false));
    new_action.add_precondition(new world_property(evaluators_id.sidor_wounded_base, false));
    new_action.add_precondition(new world_property(properties.need_cover, true));
    new_action.add_effect(new world_property(properties.need_cover, false));
    new_action.add_effect(new world_property(properties.state_mgr_logic_active, false));
    actionPlanner.add_action(operators.action_cover, new_action);

    subscribeActionForEvents(object, state, new_action);

    actionPlanner.action(action_ids.alife).add_precondition(new world_property(properties.need_cover, false));
  }

  /**
   * todo: Description.
   */
  public static override setScheme(
    object: XR_game_object,
    ini: XR_ini_file,
    scheme: EScheme,
    section: TSection,
    additional: string
  ): void {
    const state: ISchemeCoverState = AbstractScheme.assignStateAndBind(object, ini, scheme, section);

    state.logic = getConfigSwitchConditions(ini, section, object);
    state.smart = getConfigString(ini, section, "smart", object, false, "");
    state.anim = parseConditionsList(getConfigString(ini, section, "anim", object, false, "", "hide"));
    state.sound_idle = getConfigString(ini, section, "sound_idle", object, false, "");

    if (state.smart === null) {
      abort("There is no path_walk and smart in ActionCover.");
    }

    state.use_attack_direction = getConfigBoolean(ini, section, "use_attack_direction", object, false, true);

    state.radius_min = getConfigNumber(ini, section, "radius_min", object, false, 3);
    state.radius_max = getConfigNumber(ini, section, "radius_max", object, false, 5);
  }
}