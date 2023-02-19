import { alife, XR_CTime, XR_EngineBinding } from "xray16";

import { Optional } from "@/mod/lib/types";
import type { ISimSquad } from "@/mod/scripts/core/alife/SimSquad";
import { get_sim_obj_registry } from "@/mod/scripts/core/db/SimObjectsRegistry";

export interface ISimSquadReachTargetAction extends XR_EngineBinding {
  name: string;
  board: any;
  squad_id: number;
  start_time: Optional<XR_CTime>;
  idle_time: number;
  major?: boolean;
  dest_smrt: null;

  finalize(): void;
  save(): void;
  load(): void;
  update(isUnderSimulation: boolean): boolean;
  make(isUnderSimulation: boolean): void;
}

export const SimSquadReachTargetAction: ISimSquadReachTargetAction = declare_xr_class(
  "SimSquadReachTargetAction",
  null,
  {
    __init(squad: ISimSquad): void {
      this.name = "reach_target";
      this.board = squad.board;
      this.squad_id = squad.id;
    },
    finalize(): void {},
    save(): void {},
    load(): void {},
    update(isUnderSimulation): boolean {
      const squad = alife().object<ISimSquad>(this.squad_id)!;
      let squad_target = get_sim_obj_registry().objects.get(squad.assigned_target_id!);

      if (!isUnderSimulation) {
        squad_target = alife().object(squad.assigned_target_id!)!;
      }

      if (squad_target === null) {
        squad.clear_assigned_target();

        return true;
      }

      if (squad_target.am_i_reached(squad)) {
        squad_target.on_after_reach(squad);

        return true;
      }

      return false;
    },
    make(isUnderSimulation: boolean): void {
      const squad = alife().object<ISimSquad>(this.squad_id)!;
      let squad_target = get_sim_obj_registry().objects.get(squad.assigned_target_id!);

      if (!isUnderSimulation) {
        squad_target = alife().object(squad.assigned_target_id!)!;
      }

      if (squad_target !== null) {
        squad_target.on_reach_target(squad);
      }

      for (const k of squad.squad_members()) {
        if (k.object !== null) {
          this.board.setup_squad_and_group(k.object);
        }
      }
    },
  } as ISimSquadReachTargetAction
);