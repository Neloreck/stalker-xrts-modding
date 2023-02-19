import {
  alife,
  CALifeSmartTerrainTask,
  cse_alife_creature_actor,
  editor,
  level,
  XR_CALifeSmartTerrainTask,
  XR_cse_abstract,
  XR_cse_alife_creature_actor,
  XR_net_packet,
  XR_vector,
} from "xray16";

import { AnyCallable, AnyObject, TSection } from "@/mod/lib/types";
import { simulation_activities } from "@/mod/scripts/core/alife/SimActivity";
import { ISimSquad } from "@/mod/scripts/core/alife/SimSquad";
import { ISmartTerrain, nearest_to_actor_smart } from "@/mod/scripts/core/alife/SmartTerrain";
import { ESmartTerrainStatus, getCurrentSmartId } from "@/mod/scripts/core/alife/SmartTerrainControl";
import { getActor, offlineObjects, zoneByName } from "@/mod/scripts/core/db";
import { get_sim_board } from "@/mod/scripts/core/db/SimBoard";
import { evaluate_prior, get_sim_obj_registry } from "@/mod/scripts/core/db/SimObjectsRegistry";
import { getStoryObjectsRegistry } from "@/mod/scripts/core/db/StoryObjectsRegistry";
import { unregisterStoryObjectById } from "@/mod/scripts/utils/alife";
import { setLoadMarker, setSaveMarker } from "@/mod/scripts/utils/game_saves";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger("Actor");

export interface IActor extends XR_cse_alife_creature_actor {
  m_registred: boolean;
  start_position_filled: boolean;
  sim_avail: boolean;

  props: AnyObject;

  get_location(): LuaMultiReturn<[XR_vector, number, number]>;
  am_i_reached(): boolean;
  on_after_reach(squad: any): void;
  on_reach_target(squad: any): void;
  get_alife_task(): XR_CALifeSmartTerrainTask;
  sim_available(): boolean;
  target_precondition(squad: ISimSquad): boolean;
  evaluate_prior(squad: ISimSquad): number;
}

export const Actor: IActor = declare_xr_class("Actor", cse_alife_creature_actor, {
  __init(section: TSection): void {
    cse_alife_creature_actor.__init(this, section);

    this.m_registred = false;
    this.start_position_filled = false;
  },
  on_register(): void {
    cse_alife_creature_actor.on_register(this);
    logger.info("Register:", this.id, this.name(), this.section_name());
    getStoryObjectsRegistry().register(this.id, "actor");

    get_sim_obj_registry().register(this);

    this.m_registred = true;

    if (!this.start_position_filled) {
      get_sim_board().fill_start_position();
      this.start_position_filled = true;
    }
  },
  on_unregister(): void {
    logger.info("Unregister");

    cse_alife_creature_actor.on_unregister(this);
    unregisterStoryObjectById(this.id);
    get_sim_obj_registry().unregister(this);
  },
  STATE_Write(packet: XR_net_packet): void {
    cse_alife_creature_actor.STATE_Write(this, packet);

    setSaveMarker(packet, false, Actor.__name);
    packet.w_bool(this.start_position_filled);
    setSaveMarker(packet, true, Actor.__name);
  },
  STATE_Read(packet: XR_net_packet, size: number): void {
    cse_alife_creature_actor.STATE_Read(this, packet, size);

    if (editor()) {
      return;
    }

    if (getActor() === null) {
      setLoadMarker(packet, false, Actor.__name);
      this.start_position_filled = packet.r_bool();
      setLoadMarker(packet, true, Actor.__name);
    }
  },
  get_location(): LuaMultiReturn<[XR_vector, number, number]> {
    return $multi(this.position, this.m_level_vertex_id, this.m_game_vertex_id);
  },
  am_i_reached(): boolean {
    return !level.object_by_id(this.id)!.alive();
  },
  on_after_reach(squad: any): void {
    /**
     *  --squad.current_target_id = squad.smart_id
     */
  },
  on_reach_target(squad: any): void {
    squad.set_location_types();

    for (const k of squad.squadMembers() as LuaIterable<XR_cse_abstract>) {
      if (offlineObjects.get(k.id) !== null) {
        offlineObjects.set(k.id as number, {});
      }
    }

    get_sim_board().assign_squad_to_smart(squad, null);
  },
  get_alife_task(): XR_CALifeSmartTerrainTask {
    return new CALifeSmartTerrainTask(this.m_game_vertex_id, this.m_level_vertex_id);
  },
  sim_available(): boolean {
    const smarts_by_no_assault_zones = {
      ["zat_a2_sr_no_assault"]: "zat_stalker_base_smart",
      ["jup_a6_sr_no_assault"]: "jup_a6",
      ["jup_b41_sr_no_assault"]: "jup_b41",
    };

    if (nearest_to_actor_smart.dist < 50 && !get_sim_obj_registry().objects.has(nearest_to_actor_smart.id!)) {
      return false;
    }

    for (const [k, v] of pairs(smarts_by_no_assault_zones)) {
      const zone = zoneByName.get(k);

      if (zone !== null && zone.inside(this.position)) {
        const smart = get_sim_board().get_smart_by_name(v);

        if (smart !== null && smart.base_on_actor_control.status !== ESmartTerrainStatus.ALARM) {
          return false;
        }
      }
    }

    if (getCurrentSmartId() === null) {
      return true;
    }

    const smart: ISmartTerrain = alife().object<ISmartTerrain>(getCurrentSmartId()!)!;

    if (
      smart.base_on_actor_control !== null &&
      smart.base_on_actor_control.status === ESmartTerrainStatus.NORMAL &&
      zoneByName.get(smart.base_on_actor_control.noweap_zone).inside(this.position)
    ) {
      return false;
    }

    return true;
  },
  target_precondition(squad: ISimSquad): boolean {
    const squad_params = simulation_activities[squad.player_id];

    if (
      squad_params === null ||
      squad_params.actor === null ||
      (squad_params.actor.prec as AnyCallable)(squad, this) === false
    ) {
      return false;
    }

    return true;
  },
  evaluate_prior(squad: ISimSquad): number {
    return evaluate_prior(this, squad);
  },
} as IActor);