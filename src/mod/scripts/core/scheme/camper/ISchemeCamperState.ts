import { XR_vector } from "xray16";

import { LuaArray, Optional, TCount, TDistance, TDuration, TIndex, TName, TTimestamp } from "@/mod/lib/types";
import { IBaseSchemeState } from "@/mod/scripts/core/scheme/base";

/**
 * todo;
 */
export interface ICampPoint {
  key: number;
  pos: XR_vector;
}

/**
 * todo;
 */
export interface ISchemeCamperState extends IBaseSchemeState {
  path_walk: TName;
  path_look: TName;
  shoot: TName;
  sniper_aim: string;
  sniper_anim: string;
  radius: TDistance;
  sniper: boolean;
  no_retreat: boolean;
  scantime_free: TDuration;
  attack_sound: Optional<TName>;
  idle: TDuration;
  post_enemy_wait: TDuration;
  enemy_disp: number;
  scandelta: TCount;
  timedelta: TCount;
  time_scan_delta: TCount;
  suggested_state: {
    moving: string;
    moving_fire: string;
    campering: Optional<string>;
    standing: Optional<string>;
    campering_fire: Optional<string>;
  };
  scan_table: LuaTable<any, LuaArray<ICampPoint>>;
  cur_look_point: Optional<TIndex>;
  last_look_point: Optional<ICampPoint>;
  scan_begin: Optional<TTimestamp>;
  mem_enemy: Optional<TTimestamp>;
  wp_flag: Optional<number>;
}