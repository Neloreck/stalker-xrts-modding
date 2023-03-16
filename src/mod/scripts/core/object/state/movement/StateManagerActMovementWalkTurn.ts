import { action_base, LuabindClass, move } from "xray16";

import { gameConfig } from "@/mod/lib/configs/GameConfig";
import { turn } from "@/mod/scripts/core/object/state/direction/StateManagerDirection";
import { StateManager } from "@/mod/scripts/core/object/state/StateManager";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger(
  "StateManagerActMovementWalkTurn",
  gameConfig.DEBUG.IS_STATE_MANAGEMENT_DEBUG_ENABLED
);

/**
 * todo;
 */
@LuabindClass()
export class StateManagerActMovementWalkTurn extends action_base {
  public readonly stateManager: StateManager;

  /**
   * todo;
   */
  public constructor(stateManager: StateManager) {
    super(null, StateManagerActMovementWalkTurn.__name);
    this.stateManager = stateManager;
  }

  /**
   * todo;
   */
  public override initialize(): void {
    super.initialize();
    this.object.set_movement_type(move.walk);
    turn(this.object, this.stateManager);
  }

  /**
   * todo;
   */
  public override execute(): void {
    super.execute();
  }

  /**
   * todo;
   */
  public override finalize(): void {
    super.finalize();
  }
}