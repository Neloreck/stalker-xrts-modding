import { action_base, LuabindClass, move } from "xray16";

import { StateManager } from "@/engine/core/objects/state/StateManager";
import { LuaLogger } from "@/engine/core/utils/logging";
import { gameConfig } from "@/engine/lib/configs/GameConfig";

const logger: LuaLogger = new LuaLogger(
  "StateManagerActBodyStateCrouch",
  gameConfig.DEBUG.IS_STATE_MANAGEMENT_DEBUG_ENABLED
);

/**
 * todo;
 */
@LuabindClass()
export class StateManagerActBodyStateCrouch extends action_base {
  private readonly stateManager: StateManager;

  /**
   * todo: Description.
   */
  public constructor(stateManager: StateManager) {
    super(null, StateManagerActBodyStateCrouch.__name);
    this.stateManager = stateManager;
  }

  /**
   * todo: Description.
   */
  public override initialize(): void {
    super.initialize();
    this.object.set_body_state(move.crouch);
  }

  /**
   * todo: Description.
   */
  public override execute(): void {
    super.execute();
  }

  /**
   * todo: Description.
   */
  public override finalize(): void {
    super.finalize();
  }
}