import { move } from "xray16";

import { getAnimpointSitHighLoophole } from "@/engine/core/objects/animation/smart_covers/loophole_animpoint_sit_high";
import { ISmartCoverDescriptor } from "@/engine/core/objects/animation/smart_covers/types_smart_covers";
import { MZ_VECTOR, ZERO_VECTOR } from "@/engine/lib/constants/vectors";

/**
 * todo;
 */
export function getSmartCoverAnimpointSitHigh(): ISmartCoverDescriptor {
  return {
    need_weapon: false,
    loopholes: [getAnimpointSitHighLoophole("animpoint_sit_high", ZERO_VECTOR, MZ_VECTOR, MZ_VECTOR)] as any,
    transitions: [
      {
        vertex0: "",
        vertex1: "animpoint_sit_high",
        weight: 1.0,
        actions: [
          {
            precondition_functor: "xr_conditions.always",
            precondition_params: "",
            actions: [
              {
                animation: "animpoint_sit_high_in_1",
                position: ZERO_VECTOR,
                body_state: move.crouch,
                movement_type: move.run,
              },
            ],
          },
        ],
      },
      {
        vertex0: "animpoint_sit_high",
        vertex1: "",
        weight: 1.1,
        actions: [
          {
            precondition_functor: "xr_conditions.always",
            precondition_params: "",
            actions: [
              {
                animation: "animpoint_sit_high_out_1",
                position: ZERO_VECTOR,
                body_state: move.standing,
                movement_type: move.run,
              },
            ],
          },
        ],
      },
    ],
  };
}