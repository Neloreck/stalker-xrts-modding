import { action_base, property_evaluator, XR_action_base } from "xray16";

import { gameConfig } from "@/mod/lib/configs/GameConfig";
import { states } from "@/mod/scripts/core/state_management/lib/state_lib";
import { StateManager } from "@/mod/scripts/core/state_management/StateManager";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger(
  "StateManagerActAnimationStateStop",
  gameConfig.DEBUG.IS_STATE_MANAGEMENT_DEBUG_ENABLED
);

export interface IStateManagerActAnimationStateStop extends XR_action_base {
  st: StateManager;
}

export const StateManagerActAnimationStateStop: IStateManagerActAnimationStateStop = declare_xr_class(
  "StateManagerActAnimationStateStop",
  action_base,
  {
    __init(name: string, st: StateManager): void {
      action_base.__init(this, null, name);

      this.st = st;
    },
    initialize(): void {
      action_base.initialize(this);

      this.st.animstate.set_state(null, this.st.fast_set || states.get(this.st.target_state).fast_set);
      this.st.animstate.set_control();
    },
    execute(): void {
      logger.info("Act animation state stop");
      action_base.execute(this);
    },
    finalize(): void {
      action_base.finalize(this);
    },
  } as IStateManagerActAnimationStateStop
);