import { cse_torrid_zone, editor, game, LuabindClass, system_ini, XR_CTime, XR_net_packet } from "xray16";

import { Optional, TSection } from "@/mod/lib/types";
import { checkSpawnIniForStoryId } from "@/mod/scripts/core/database/StoryObjectsRegistry";
import { getConfigNumber } from "@/mod/scripts/utils/config";
import { isSinglePlayerGame } from "@/mod/scripts/utils/general";
import { LuaLogger } from "@/mod/scripts/utils/logging";
import { readCTimeFromPacket, writeCTimeToPacket } from "@/mod/scripts/utils/time";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
@LuabindClass()
export class ZoneTorrid extends cse_torrid_zone {
  public m_registred: boolean = false;
  public last_spawn_time: Optional<XR_CTime> = null;
  public artefact_spawn_idle: number = 0;
  public artefact_spawn_rnd: number = 0;

  /**
   * todo;
   */
  public constructor(section: TSection) {
    super(section);
  }

  /**
   * todo;
   */
  public override on_register(): void {
    super.on_register();

    logger.info("Register:", this.id, this.name(), this.section_name());

    checkSpawnIniForStoryId(this);

    this.m_registred = true;
    this.artefact_spawn_idle =
      60 * 60 * 1000 * getConfigNumber(system_ini(), this.section_name(), "artefact_spawn_idle", this, false, 24);
    this.artefact_spawn_rnd = getConfigNumber(
      system_ini(),
      this.section_name(),
      "artefact_spawn_rnd",
      this,
      false,
      100
    );
  }

  /**
   * todo;
   */
  public override update(): void {
    super.update();

    if (this.last_spawn_time === null) {
      this.last_spawn_time = game.get_game_time();
    }

    if (game.get_game_time().diffSec(this.last_spawn_time) >= this.artefact_spawn_idle) {
      this.last_spawn_time = game.get_game_time();

      if (math.random(100) <= this.artefact_spawn_rnd) {
        // todo: Commented in XR engine?
        logger.warn("Wanted to spawn artefacts, but missing in original engine functionality used");
        // this.spawn_artefacts();
      }
    }
  }

  /**
   * todo;
   */
  public override STATE_Write(packet: XR_net_packet): void {
    super.STATE_Write(packet);

    if (!isSinglePlayerGame()) {
      return;
    }

    if (this.last_spawn_time === null) {
      packet.w_u8(0);
    } else {
      packet.w_u8(1);
      writeCTimeToPacket(packet, this.last_spawn_time);
    }
  }

  /**
   * todo;
   */
  public override STATE_Read(packet: XR_net_packet, size: number): void {
    super.STATE_Read(packet, size);

    if (editor() || !isSinglePlayerGame()) {
      return;
    }

    const flag: number = packet.r_u8();

    if (flag === 1) {
      this.last_spawn_time = readCTimeFromPacket(packet);
    }
  }
}