import { XR_game_object, XR_ini_file } from "xray16";

import { registry } from "@/engine/core/database";
import { AbstractScheme } from "@/engine/core/schemes/base/AbstractScheme";
import { HitManager } from "@/engine/core/schemes/hit/HitManager";
import { ISchemeHitState } from "@/engine/core/schemes/hit/ISchemeHitState";
import { subscribeActionForEvents } from "@/engine/core/schemes/subscribeActionForEvents";
import { unsubscribeActionFromEvents } from "@/engine/core/schemes/unsubscribeActionFromEvents";
import { abort } from "@/engine/core/utils/debug";
import { getConfigSwitchConditions } from "@/engine/core/utils/ini/config";
import { LuaLogger } from "@/engine/core/utils/logging";
import { EScheme, ESchemeType, Optional, TSection } from "@/engine/lib/types";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
export class SchemeHit extends AbstractScheme {
  public static override readonly SCHEME_SECTION: EScheme = EScheme.HIT;
  public static override readonly SCHEME_TYPE: ESchemeType = ESchemeType.STALKER;

  /**
   * todo: Description.
   */
  public static override addToBinder(
    object: XR_game_object,
    ini: XR_ini_file,
    scheme: EScheme,
    section: TSection,
    storage: ISchemeHitState
  ): void {
    storage.action = new HitManager(object, storage);
  }

  /**
   * todo: Description.
   */
  public static override disableScheme(object: XR_game_object, scheme: EScheme): void {
    const state: Optional<ISchemeHitState> = registry.objects.get(object.id())[scheme] as ISchemeHitState;

    if (state !== null) {
      unsubscribeActionFromEvents(object, state, state.action);
    }
  }

  /**
   * todo: Description.
   */
  public static override setScheme(object: XR_game_object, ini: XR_ini_file, scheme: EScheme, section: TSection): void {
    const state: ISchemeHitState = AbstractScheme.assignStateAndBind(object, ini, scheme, section);

    if (!ini.section_exist(section)) {
      abort("There is no section [%s] for npc [%s]", section, object.name());
    }

    state.logic = getConfigSwitchConditions(ini, section, object);

    subscribeActionForEvents(object, state, state.action);
  }
}