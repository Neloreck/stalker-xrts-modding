import { XR_game_object, XR_ini_file } from "xray16";

import { AnyCallablesModule } from "@/mod/lib/types";
import { getActor, IStoredObject } from "@/mod/scripts/core/db";
import { AbstractSchemeAction } from "@/mod/scripts/core/logic/AbstractSchemeAction";
import {
  getConfigCondList,
  getConfigNumber,
  getConfigString,
  getConfigStringAndCondList
} from "@/mod/scripts/utils/configs";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const log: LuaLogger = new LuaLogger("ActionCodepad");

export class ActionCodepad extends AbstractSchemeAction {
  public static readonly SCHEME_SECTION: string = "ph_code";

  public static add_to_binder(
    object: XR_game_object,
    ini: XR_ini_file,
    scheme: string,
    section: string,
    storage: IStoredObject
  ): void {
    get_global<AnyCallablesModule>("xr_logic").subscribe_action_for_events(
      object,
      storage,
      new ActionCodepad(object, storage)
    );
  }

  public static set_scheme(object: XR_game_object, ini: XR_ini_file, scheme: string, section: string): void {
    const state = get_global<AnyCallablesModule>("xr_logic").assign_storage_and_bind(object, ini, scheme, section);

    state.logic = get_global<AnyCallablesModule>("xr_logic").cfg_get_switch_conditions(ini, section, object);
    state.tips = getConfigString(ini, section, "tips", object, false, "", "st_codelock");

    object.set_tip_text(state.tips);

    state.code = getConfigNumber(ini, section, "code", object, false);

    if (state.code) {
      state.on_code = getConfigCondList(ini, section, "on_code", object);
    } else {
      state.on_check_code = {};

      let i: number = 1;
      let cc = getConfigStringAndCondList(ini, section, "on_check_code" + i, object);

      while (cc) {
        state.on_check_code[cc.v1] = cc.condlist;
        i = i + 1;
        cc = getConfigStringAndCondList(ini, section, "on_check_code" + i, object);
      }
    }
  }

  public reset_scheme(): void {
    this.object.set_nonscript_usable(false);
  }

  public use_callback(object: XR_game_object, who: XR_game_object): void {
    log.info("Use codepad:", object.name(), who?.name());

    const numpad = get_global("ui_numpad").numpad(this);

    numpad.ShowDialog(true);
  }

  public OnNumberReceive(text: string): void {
    if (this.state.code) {
      if (tonumber(text) === this.state.code) {
        if (this.state.on_code) {
          get_global<AnyCallablesModule>("xr_logic").pick_section_from_condlist(
            getActor(),
            this.object,
            this.state.on_code.condlist
          );
        }
      }
    } else {
      const condlist = this.state.on_check_code[text];

      if (condlist) {
        get_global<AnyCallablesModule>("xr_logic").pick_section_from_condlist(getActor(), this.object, condlist);
      }
    }
  }

  public deactivate(): void {
    this.object.set_tip_text("");
  }
}