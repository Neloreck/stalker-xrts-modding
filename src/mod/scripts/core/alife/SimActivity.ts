import { XR_cse_alife_object } from "xray16";

import { communities, TCommunity } from "@/mod/globals/communities";
import { Optional, PartialRecord } from "@/mod/lib/types";
import { ISimSquad } from "@/mod/scripts/core/alife/SimSquad";
import { is_started } from "@/mod/scripts/core/SurgeManager";
import { travelManager } from "@/mod/scripts/core/TravelManager";
import { hasAlifeInfo } from "@/mod/scripts/utils/actor";
import { getAlifeDistanceBetween } from "@/mod/scripts/utils/alife";
import { LuaLogger } from "@/mod/scripts/utils/logging";
import { isInTimeInterval } from "@/mod/scripts/utils/time";

const logger: LuaLogger = new LuaLogger("SimActivity");

export type TSimActivityPreconditionChecker = (squad: ISimSquad, target: XR_cse_alife_object) => boolean;

export interface ISimActivityPrecondition {
  prec: TSimActivityPreconditionChecker;
}

export type TSimActivitySmartType = "surge" | "base" | "resource" | "territory" | "lair";

export interface ISimActivityDescriptor {
  squad: Optional<PartialRecord<TCommunity, Optional<ISimActivityPrecondition>>>;
  smart: Optional<PartialRecord<TSimActivitySmartType, Optional<ISimActivityPrecondition>>>;
  actor: Optional<ISimActivityPrecondition>;
}

export const simulation_activities: Record<TCommunity, ISimActivityDescriptor> = {
  [communities.none]: {
    squad: null,
    smart: null,
    actor: null,
  },
  [communities.stalker]: {
    squad: null,
    smart: {
      base: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(18, 8) &&
          !is_started() &&
          !travelManager.check_squad_for_enemies(squad) &&
          (target.name() === "zat_stalker_base_smart" || target.name() === "jup_a6" || target.name() === "pri_a16"),
      },
      surge: { prec: () => is_started() },
      territory: {
        prec: () => isInTimeInterval(8, 18) && !is_started(),
      },
      resource: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) => isInTimeInterval(8, 18) && !is_started(),
      },
    },
    actor: null,
  },
  [communities.bandit]: {
    squad: {
      stalker: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 21) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
    },
    smart: {
      base: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(21, 8) &&
          !is_started() &&
          !travelManager.check_squad_for_enemies(squad) &&
          (target.name() === "zat_stalker_base_smart" || target.name() === "jup_a10_smart_terrain"),
      },
      territory: {
        prec: () => isInTimeInterval(8, 21) && !is_started(),
      },
      surge: { prec: () => is_started() },
      resource: null,
    },
    actor: {
      prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
        hasAlifeInfo("sim_bandit_attack_harder") && getAlifeDistanceBetween(squad, target) <= 150,
    },
  },
  [communities.dolg]: {
    squad: {
      freedom: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 19) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
      monster_predatory_day: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 19) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
      monster_predatory_night: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 19) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
      monster_vegetarian: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 19) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
      monster_zombied_day: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 19) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
      monster_special: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 19) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
    },
    smart: {
      base: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 8) &&
          !is_started() &&
          !travelManager.check_squad_for_enemies(squad) &&
          (target.name() === "zat_stalker_base_smart" || target.name() === "jup_a6" || target.name() === "pri_a16"),
      },
      territory: {
        prec: () => isInTimeInterval(8, 19) && !is_started(),
      },
      surge: { prec: () => is_started() },
      resource: null,
    },
    actor: null,
  },
  [communities.freedom]: {
    squad: {
      dolg: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(8, 19) && !is_started() && getAlifeDistanceBetween(squad, target) <= 150,
      },
    },
    smart: {
      base: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 8) &&
          !is_started() &&
          !travelManager.check_squad_for_enemies(squad) &&
          (target.name() === "zat_stalker_base_smart" || target.name() === "jup_a6" || target.name() === "pri_a16"),
      },
      territory: {
        prec: () => isInTimeInterval(8, 19) && !is_started(),
      },
      surge: { prec: () => is_started() },
      resource: null,
    },
    actor: null,
  },
  [communities.killer]: {
    squad: null,
    smart: {
      territory: { prec: () => !is_started() },
      base: null,
      resource: null,
      surge: { prec: () => is_started() },
    },
    actor: {
      prec: (squad: ISimSquad, target: XR_cse_alife_object) => getAlifeDistanceBetween(squad, target) <= 150,
    },
  },
  [communities.zombied]: {
    squad: null,
    smart: { territory: { prec: () => true }, lair: { prec: () => true }, resource: null, base: null },
    actor: null,
  },
  [communities.monster_predatory_day]: {
    squad: {
      monster_vegetarian: { prec: () => isInTimeInterval(6, 19) },
      stalker: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      bandit: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      dolg: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      freedom: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      killer: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
    },
    smart: {
      territory: { prec: () => isInTimeInterval(6, 19) },
      lair: { prec: () => isInTimeInterval(19, 6) },
      base: null,
      resource: null,
    },
    actor: {
      prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
        isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
    },
  },
  [communities.monster_predatory_night]: {
    squad: {
      monster_vegetarian: { prec: () => isInTimeInterval(21, 6) },
      stalker: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      bandit: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      dolg: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      freedom: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      killer: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
    },
    smart: {
      territory: { prec: () => isInTimeInterval(19, 6) },
      lair: { prec: () => isInTimeInterval(6, 19) },
      base: null,
      resource: null,
    },
    actor: {
      prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
        isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
    },
  },
  [communities.monster_vegetarian]: {
    squad: null,
    smart: {
      lair: { prec: () => true },
      base: null,
      resource: null,
    },
    actor: {
      prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
        isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
    },
  },
  [communities.monster_zombied_day]: {
    squad: {
      stalker: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      bandit: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      dolg: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      freedom: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      killer: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
      },
    },
    smart: {
      territory: { prec: () => !is_started() },
      lair: { prec: () => isInTimeInterval(19, 6) },
      base: null,
      resource: null,
    },
    actor: {
      prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
        isInTimeInterval(6, 19) && getAlifeDistanceBetween(squad, target) <= 150,
    },
  },
  [communities.monster_zombied_night]: {
    squad: {
      stalker: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      bandit: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      dolg: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      freedom: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
      killer: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
          isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
      },
    },
    smart: {
      territory: { prec: () => isInTimeInterval(19, 6) },
      lair: { prec: () => isInTimeInterval(6, 19) },
      base: null,
      resource: null,
    },
    actor: {
      prec: (squad: ISimSquad, target: XR_cse_alife_object) =>
        isInTimeInterval(19, 6) && getAlifeDistanceBetween(squad, target) <= 150,
    },
  },
  [communities.monster_special]: {
    squad: null,
    smart: { lair: { prec: () => true }, base: null, resource: null },
    actor: null,
  },
  [communities.monster]: {
    squad: null,
    smart: { lair: { prec: () => true }, base: null, resource: null },
    actor: null,
  },
  [communities.army]: {
    squad: null,
    smart: {
      base: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) => isInTimeInterval(18, 8) && !is_started(),
      },
      surge: { prec: () => is_started() },
      territory: {
        prec: () => isInTimeInterval(8, 18) && !is_started(),
      },
      resource: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) => isInTimeInterval(8, 18) && !is_started(),
      },
    },
    actor: null,
  },
  [communities.ecolog]: {
    squad: null,
    smart: {
      base: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) => isInTimeInterval(18, 8) && !is_started(),
      },
      surge: { prec: () => is_started() },
      territory: {
        prec: () => isInTimeInterval(8, 18) && !is_started(),
      },
      resource: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) => isInTimeInterval(8, 18) && !is_started(),
      },
    },
    actor: null,
  },
  [communities.monolith]: {
    squad: null,
    smart: {
      base: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) => isInTimeInterval(18, 8) && !is_started(),
      },
      surge: { prec: () => is_started() },
      territory: {
        prec: () => isInTimeInterval(8, 18) && !is_started(),
      },
      resource: {
        prec: (squad: ISimSquad, target: XR_cse_alife_object) => isInTimeInterval(8, 18) && !is_started(),
      },
    },
    actor: null,
  },
};