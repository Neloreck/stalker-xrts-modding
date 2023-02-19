import { stalker_ids, XR_game_object, XR_ini_file } from "xray16";

import { EScheme, ESchemeType, TSection } from "@/mod/lib/types";
import { IStoredObject } from "@/mod/scripts/core/db";
import { assignStorageAndBind } from "@/mod/scripts/core/schemes/assignStorageAndBind";
import { AbstractScheme } from "@/mod/scripts/core/schemes/base";
import { EvaluatorGatherItems } from "@/mod/scripts/core/schemes/gather_items/evaluators/EvaluatorGatherItems";
import { getConfigBoolean } from "@/mod/scripts/utils/configs";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger("SchemeGatherItems");

/**
 * todo;
 */
export class SchemeGatherItems extends AbstractScheme {
  public static readonly SCHEME_SECTION: EScheme = EScheme.GATHER_ITEMS;
  public static readonly SCHEME_TYPE: ESchemeType = ESchemeType.STALKER;

  public static add_to_binder(
    object: XR_game_object,
    ini: XR_ini_file,
    scheme: string,
    section: string,
    state: IStoredObject
  ): void {
    logger.info("Add to binder:", object.name());

    const manager = object.motivation_action_manager();

    manager.remove_evaluator(stalker_ids.property_items);
    manager.add_evaluator(
      stalker_ids.property_items,
      create_xr_class_instance(EvaluatorGatherItems, "is_there_items_to_pickup", state, object)
    );
  }

  public static set_gather_items(object: XR_game_object, ini: XR_ini_file, scheme: EScheme, section: TSection): void {
    logger.info("Set gather items:", object.name());

    assignStorageAndBind(object, ini, scheme, section);
  }

  public static resetScheme(object: XR_game_object, scheme: EScheme, state: IStoredObject, section: TSection): void {
    state.gather_items.gather_items_enabled = getConfigBoolean(
      state.ini!,
      section,
      "gather_items_enabled",
      object,
      false,
      true
    );
  }
}