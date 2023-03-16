import { AbstractCoreManager } from "@/mod/scripts/core/manager/AbstractCoreManager";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

export class LoadScreenManager extends AbstractCoreManager {
  public get_tip_number(levelName: string): number {
    logger.info("Get tip for single player game");

    return math.random(1, 100);
  }

  public get_mp_tip_number(levelName: string): number {
    logger.info("Get tip for multiplayer game");

    return math.random(1, 55);
  }
}

export const loadScreenManager: LoadScreenManager = LoadScreenManager.getInstance();