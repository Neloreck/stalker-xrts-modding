import { clsid, ini_file, XR_cse_alife_object, XR_EngineBinding } from "xray16";

import { Optional } from "@/mod/lib/types";
import { IActor } from "@/mod/scripts/core/alife/Actor";
import { ISimSquad } from "@/mod/scripts/core/alife/SimSquad";
import { ISmartTerrain } from "@/mod/scripts/core/alife/SmartTerrain";
import { getActor } from "@/mod/scripts/core/db/index";
import { areOnSameAlifeLevel, getAlifeDistanceBetween } from "@/mod/scripts/utils/alife";
import { parseCondList, pickSectionFromCondList } from "@/mod/scripts/utils/configs";

let sim_objects_registry: Optional<ISimObjectsRegistry> = null;
const props_ini = new ini_file("misc\\simulation_objects_props.ltx");

export interface ISimObjectsRegistry extends XR_EngineBinding {
  objects: LuaTable<number, IActor | ISimSquad | ISmartTerrain>;
  register(obj: XR_cse_alife_object): void;
  update_avaliability(obj: XR_cse_alife_object): void;
  get_props(obj: XR_cse_alife_object): void;
  unregister(obj: XR_cse_alife_object): void;
}

export const SimObjectsRegistry: ISimObjectsRegistry = declare_xr_class("SimObjectsRegistry", null, {
  __init(): void {
    this.objects = new LuaTable();
  },
  register(obj: XR_cse_alife_object): void {
    this.get_props(obj);
    this.update_avaliability(obj);
  },
  update_avaliability(obj: ISmartTerrain): void {
    if (pickSectionFromCondList(getActor()!, obj, obj.sim_avail as any) === "true" && obj.sim_available()) {
      this.objects.set(obj.id, obj);
    } else {
      this.objects.delete(obj.id);
    }
  },
  get_props(obj: ISmartTerrain | ISimSquad | IActor) {
    obj.props = new LuaTable();

    let props_section: string = obj.name();

    if (obj.clsid() === clsid.online_offline_group_s) {
      props_section = obj.section_name();
    }

    if (!props_ini.section_exist(props_section)) {
      props_section = "default";

      if (obj.clsid() === clsid.online_offline_group_s) {
        props_section = "default_squad";
      }

      if (obj.clsid() === clsid.script_actor) {
        props_section = "actor";
      }
    }

    const n: number = props_ini.line_count(props_section);

    for (const j of $range(0, n - 1)) {
      const [result, prop_name, prop_condlist] = props_ini.r_line(props_section, j, "", "");

      if (prop_name === "sim_avail") {
        obj.sim_avail = parseCondList(null, "simulation_object", "sim_avail", prop_condlist);
      } else {
        obj.props[prop_name] = prop_condlist;
      }
    }

    if (obj.sim_avail === null) {
      obj.sim_avail = parseCondList(null, "simulation_object", "sim_avail", "true");
    }
  },
  unregister(obj: XR_cse_alife_object): void {
    this.objects.delete(obj.id);
  },
} as ISimObjectsRegistry);

export function get_sim_obj_registry() {
  if (sim_objects_registry === null) {
    sim_objects_registry = create_xr_class_instance(SimObjectsRegistry);
  }

  return sim_objects_registry;
}

export function evaluate_prior_by_dist(target: ISmartTerrain | IActor | ISimSquad, squad: ISimSquad): number {
  const dist = math.max(getAlifeDistanceBetween(target, squad), 1);

  return 1 + 1 / dist;
}

export function evaluate_prior(target: ISmartTerrain | IActor | ISimSquad, squad: ISimSquad): number {
  let prior = 0;

  if (!target.target_precondition(squad) || !areOnSameAlifeLevel(target, squad)) {
    return 0;
  } else {
    prior = 3;
  }

  for (const [k, v] of squad.behaviour) {
    const squad_koeff: number = tonumber(v)!;
    let target_koeff: number = 0;

    if (target.props[k] !== null) {
      target_koeff = tonumber(target.props[k])!;
    }

    prior = prior + squad_koeff * target_koeff;
  }

  return prior * evaluate_prior_by_dist(target, squad);
}