import { action_base, LuabindClass } from "xray16";

import { StalkerStateManager } from "@/engine/core/objects/ai/state/StalkerStateManager";
import { LuaLogger } from "@/engine/core/utils/logging";
import {
  getObjectWeaponForAnimationState,
  getWeaponStateForAnimationState,
} from "@/engine/core/utils/object/object_weapon";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Unstrap active weapon item.
 */
@LuabindClass()
export class ActionWeaponUnstrap extends action_base {
  private readonly stateManager: StalkerStateManager;

  public constructor(stateManager: StalkerStateManager) {
    super(null, ActionWeaponUnstrap.__name);
    this.stateManager = stateManager;
  }

  /**
   * Unstrap active animation weapon.
   */
  public override initialize(): void {
    super.initialize();

    this.object.set_item(
      getWeaponStateForAnimationState(this.stateManager.targetState),
      getObjectWeaponForAnimationState(this.object, this.stateManager.targetState)
    );
  }
}