import { time_global, XR_game_object } from "xray16";

import { registry } from "@/mod/scripts/core/database";
import { AbstractSchemeManager } from "@/mod/scripts/core/scheme/base/AbstractSchemeManager";
import { trySwitchToAnotherSection } from "@/mod/scripts/core/scheme/base/trySwitchToAnotherSection";
import { switchToSection } from "@/mod/scripts/core/scheme/switchToSection";
import { ISchemeTimerState } from "@/mod/scripts/core/scheme/timer/ISchemeTimerState";
import { pickSectionFromCondList } from "@/mod/scripts/utils/config";
import { timeToString } from "@/mod/scripts/utils/general";

/**
 * todo;
 */
export class SchemeTimerManager extends AbstractSchemeManager<ISchemeTimerState> {
  /**
   * todo;
   */
  public constructor(object: XR_game_object, state: ISchemeTimerState) {
    super(object, state);
  }

  /**
   * todo;
   */
  public override update(): void {
    const actor = registry.actor;

    if (trySwitchToAnotherSection(this.object, this.state, actor)) {
      return;
    }

    const nn = time_global() - registry.objects.get(this.object.id()).activation_time;

    let value_time = this.state.type === "inc" ? this.state.start_value + nn : this.state.start_value - nn;

    if (value_time <= 0) {
      value_time = 0;
    }

    this.state.timer.TextControl().SetTextST(timeToString(value_time));

    for (const [k, v] of this.state.on_value!) {
      if ((this.state.type === "dec" && value_time <= v.dist) || (this.state.type === "inc" && value_time >= v.dist)) {
        switchToSection(this.object, this.state.ini!, pickSectionFromCondList(registry.actor, this.object, v.state)!);
      }
    }
  }

  /**
   * todo;
   */
  public override deactivate(): void {
    this.state.ui.RemoveCustomStatic(this.state.timer_id);

    if (this.state.string !== null) {
      this.state.ui.RemoveCustomStatic("hud_timer_text");
    }
  }
}