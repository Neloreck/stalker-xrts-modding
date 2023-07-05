import { registry } from "@/engine/core/database";
import { LuaLogger } from "@/engine/core/utils/logging";
import { TInfoPortion } from "@/engine/lib/constants/info_portions/info_portions";
import { Optional, TCount, TName } from "@/engine/lib/types";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo: Add utility to check object of 'active' + object 'inactive' properties to check complex lists.
 */

/**
 * todo;
 */
export function giveInfo(infoId?: Optional<TName>): void {
  logger.info("Give alife info:", infoId);

  if (infoId) {
    registry.actor.give_info_portion(infoId);
  }
}

/**
 * todo;
 */
export function disableInfo(infoId?: Optional<TName>): void {
  logger.info("Disable alife info:", infoId);

  if (infoId && hasAlifeInfo(infoId)) {
    registry.actor.disable_info_portion(infoId);
  }
}

/**
 * Whether actor has alife info active.
 */
export function hasAlifeInfo(infoId?: Optional<TName>): infoId is TInfoPortion {
  if (!infoId || !registry.actor) {
    return false;
  }

  return registry.actor.has_info(infoId);
}

/**
 * Whether actor has all alife info from the list.
 * @param infoIds - array of infos to check.
 */
export function hasAlifeInfos(infoIds: Array<TName>): boolean {
  return hasFewAlifeInfos(infoIds, infoIds.length);
}

/**
 * Whether actor has at least one alife info from the list.
 * @param infoIds - array of infos to check.
 */
export function hasAtLeastOneAlifeInfo(infoIds: Array<TName>): boolean {
  return hasFewAlifeInfos(infoIds, 1);
}

/**
 * Whether actor has alife infos from the list.
 * @param infoIds - array of infos to check.
 * @param count - count of infos required to satisfy conditions.
 */
export function hasFewAlifeInfos(infoIds: Array<TName>, count: TCount): boolean {
  let activeInfos: TCount = 0;

  for (let it = 0; it < infoIds.length; it++) {
    if (registry.actor.has_info(infoIds[it])) {
      activeInfos += 1;

      if (activeInfos >= count) {
        return true;
      }
    }
  }

  return false;
}