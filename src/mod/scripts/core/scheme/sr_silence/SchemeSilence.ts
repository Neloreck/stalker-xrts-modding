import { XR_game_object, XR_ini_file } from "xray16";

import { EScheme, ESchemeType, TSection } from "@/mod/lib/types/scheme";
import { registry } from "@/mod/scripts/core/database";
import { AbstractScheme } from "@/mod/scripts/core/scheme/base/AbstractScheme";
import { ISchemeSilenceState } from "@/mod/scripts/core/scheme/sr_silence/ISchemeSilenceState";
import { SilenceManager } from "@/mod/scripts/core/scheme/sr_silence/SilenceManager";
import { subscribeActionForEvents } from "@/mod/scripts/core/scheme/subscribeActionForEvents";
import { getConfigSwitchConditions } from "@/mod/scripts/utils/config";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Scheme to implement zones where playing dynamic music is restricted.
 */
export class SchemeSilence extends AbstractScheme {
  public static override readonly SCHEME_SECTION: EScheme = EScheme.SR_SILENCE;
  public static override readonly SCHEME_TYPE: ESchemeType = ESchemeType.RESTRICTOR;

  /**
   * todo;
   */
  public static override addToBinder(
    object: XR_game_object,
    ini: XR_ini_file,
    scheme: EScheme,
    section: TSection,
    state: ISchemeSilenceState
  ): void {
    subscribeActionForEvents(object, state, new SilenceManager(object, state));
  }

  /**
   * todo;
   */
  public static override setScheme(object: XR_game_object, ini: XR_ini_file, scheme: EScheme, section: TSection): void {
    const state: ISchemeSilenceState = AbstractScheme.assignStateAndBind(object, ini, scheme, section);

    state.logic = getConfigSwitchConditions(ini, section, object);

    registry.silenceZones.set(object.id(), object.name());
  }
}