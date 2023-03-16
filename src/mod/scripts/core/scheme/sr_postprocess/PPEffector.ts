import { effector, effector_params, LuabindClass, XR_effector_params } from "xray16";

import { TNumberId } from "@/mod/lib/types";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
@LuabindClass()
export class PPEffector extends effector {
  public readonly params: XR_effector_params = new effector_params();

  /**
   * todo;
   */
  public constructor(idNumber: TNumberId) {
    super(idNumber, 10000000);
  }

  /**
   * todo;
   */
  public override process(effector_params: XR_effector_params): boolean {
    effector_params.assign(this.params);
    super.process(effector_params);

    return true;
  }
}