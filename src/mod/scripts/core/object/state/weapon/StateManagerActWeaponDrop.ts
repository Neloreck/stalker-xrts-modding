import { action_base, LuabindClass, object, XR_game_object } from "xray16";

import { gameConfig } from "@/mod/lib/configs/GameConfig";
import { Optional } from "@/mod/lib/types";
import { StateManager } from "@/mod/scripts/core/object/state/StateManager";
import { get_weapon } from "@/mod/scripts/core/object/state/weapon/StateManagerWeapon";
import { setItemCondition } from "@/mod/scripts/utils/alife";
import { isStrappableWeapon } from "@/mod/scripts/utils/check/is";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger(
  "StateManagerActWeaponDrop",
  gameConfig.DEBUG.IS_STATE_MANAGEMENT_DEBUG_ENABLED
);

/**
 * todo;
 */
@LuabindClass()
export class StateManagerActWeaponDrop extends action_base {
  private readonly stateManager: StateManager;

  /**
   * todo;
   */
  public constructor(stateManager: StateManager) {
    super(null, StateManagerActWeaponDrop.__name);
    this.stateManager = stateManager;
  }

  /**
   * todo;
   */
  public override initialize(): void {
    super.initialize();

    const weapon: Optional<XR_game_object> = get_weapon(this.object, this.stateManager.target_state);

    if (isStrappableWeapon(weapon)) {
      this.object.set_item(object.drop, weapon);
      // todo: Configured condition in one place.
      setItemCondition(weapon, math.random(40, 80));
    } else {
      this.object.set_item(object.idle, null);
    }
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