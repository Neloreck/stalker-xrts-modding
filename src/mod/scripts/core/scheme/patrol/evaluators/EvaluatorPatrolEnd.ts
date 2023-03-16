import { LuabindClass, property_evaluator } from "xray16";

import { ISchemePatrolState } from "@/mod/scripts/core/scheme/patrol";
import { isActiveSection } from "@/mod/scripts/utils/check/is";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
@LuabindClass()
export class EvaluatorPatrolEnd extends property_evaluator {
  public readonly state: ISchemePatrolState;

  /**
   * todo;
   */
  public constructor(state: ISchemePatrolState) {
    super(null, EvaluatorPatrolEnd.__name);
    this.state = state;
  }

  /**
   * todo;
   */
  public override evaluate(): boolean {
    return !isActiveSection(this.object, this.state.section);
  }
}