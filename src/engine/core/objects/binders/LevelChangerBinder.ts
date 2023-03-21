import {
  alife,
  command_line,
  LuabindClass,
  object_binder,
  XR_cse_alife_object,
  XR_game_object,
  XR_net_packet,
  XR_reader,
} from "xray16";

import { registerObject, resetObject, unregisterObject } from "@/engine/core/database";
import { LevelChanger } from "@/engine/core/objects/alife/LevelChanger";
import { loadObject, saveObject } from "@/engine/core/schemes/storing";
import { setLoadMarker, setSaveMarker } from "@/engine/core/utils/game_save";
import { LuaLogger } from "@/engine/core/utils/logging";
import { TSection } from "@/engine/lib/types/scheme";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
@LuabindClass()
export class LevelChangerBinder extends object_binder {
  public constructor(object: XR_game_object) {
    super(object);
  }

  /**
   * todo: Description.
   */
  public override update(delta: number): void {
    super.update(delta);
  }

  /**
   * todo: Description.
   */
  public override reload(section: TSection): void {
    super.reload(section);
  }

  /**
   * todo: Description.
   */
  public override reinit(): void {
    super.reinit();
    resetObject(this.object);
  }

  /**
   * todo: Description.
   */
  public override net_spawn(cse_object: XR_cse_alife_object): boolean {
    if (!super.net_spawn(cse_object)) {
      return false;
    }

    const [index] = string.find(command_line(), "-designer");

    if (index !== null) {
      return true;
    }

    registerObject(this.object);

    const s_obj: LevelChanger = alife().object(this.object.id()) as LevelChanger;

    this.object.enable_level_changer(s_obj.enabled);
    this.object.set_level_changer_invitation(s_obj.hint);

    logger.info("Net spawned:", this.object.id(), s_obj.enabled, s_obj.hint);

    return true;
  }

  /**
   * todo: Description.
   */
  public override net_destroy(): void {
    logger.info("Net destroy:", this.object.name());
    unregisterObject(this.object);
    super.net_destroy();
  }

  /**
   * todo: Description.
   */
  public override net_save_relevant(): boolean {
    return true;
  }

  /**
   * todo: Description.
   */
  public override save(packet: XR_net_packet): void {
    setSaveMarker(packet, false, LevelChangerBinder.__name);

    super.save(packet);
    saveObject(this.object, packet);

    setSaveMarker(packet, true, LevelChangerBinder.__name);
  }

  /**
   * todo: Description.
   */
  public override load(reader: XR_reader): void {
    setLoadMarker(reader, false, LevelChangerBinder.__name);

    super.load(reader);
    loadObject(this.object, reader);

    setLoadMarker(reader, true, LevelChangerBinder.__name);
  }
}