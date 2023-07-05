import { game, level, time_global, verify_if_thread_is_running } from "xray16";

import { LuaLogger } from "@/engine/core/utils/logging";
import { MAX_U8 } from "@/engine/lib/constants/memory";
import { NetPacket, NetProcessor, Optional, TDuration, Time, TLabel, TRate, TTimestamp } from "@/engine/lib/types";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo
 */
function addTimeDigit(data: string, digit: number): string {
  return digit > 9 ? data + digit : data + "0" + digit;
}

/**
 * todo;
 */
export function gameTimeToString(time: Time): string {
  const [y, m, d, h, min] = time.get(0, 0, 0, 0, 0, 0, 0);

  let dateTime: TLabel = "";

  dateTime = addTimeDigit(dateTime, h);
  dateTime = dateTime + ":";
  dateTime = addTimeDigit(dateTime, min);
  dateTime = dateTime + " ";
  dateTime = addTimeDigit(dateTime, m);
  dateTime = dateTime + "/";
  dateTime = addTimeDigit(dateTime, d);
  dateTime = dateTime + "/";
  dateTime = dateTime + y;

  return dateTime;
}

/**
 * @param time - time duration in millis
 * @returns hh:mm:ss formatted time
 */
export function globalTimeToString(time: number): string {
  const hours: number = math.floor(time / 3600000);
  const minutes: number = math.floor(time / 60000 - hours * 60);
  const seconds: number = math.floor(time / 1000 - hours * 3600 - minutes * 60);

  return string.format(
    "%s:%s:%s",
    tostring(hours),
    (minutes >= 10 ? "" : "0") + tostring(minutes),
    (seconds >= 10 ? "" : "0") + tostring(seconds)
  );
}

/**
 * Check whether current time interval is between desired values.
 */
export function isInTimeInterval(fromHours: TTimestamp, toHouds: TTimestamp): boolean {
  const gameHours: TTimestamp = level.get_time_hours();

  if (fromHours >= toHouds) {
    return gameHours < toHouds || gameHours >= fromHours;
  } else {
    return gameHours < toHouds && gameHours >= fromHours;
  }
}

/**
 * Lock scripts execution based on game time.
 */
export function waitGame(timeToWait: Optional<TDuration> = null): void {
  verify_if_thread_is_running();

  if (timeToWait === null) {
    coroutine.yield();
  } else {
    const timeToStop: TTimestamp = game.time() + timeToWait;

    while (game.time() <= timeToStop) {
      coroutine.yield();
    }
  }
}

/**
 * Lock scripts execution based on real time.
 */
export function wait(timeToWait: Optional<TDuration> = null): void {
  verify_if_thread_is_running();

  if (timeToWait === null) {
    coroutine.yield();
  } else {
    const timeToStop: TTimestamp = time_global() + timeToWait;

    while (time_global() <= timeToStop) {
      coroutine.yield();
    }
  }
}

/**
 * todo;
 */
export function writeTimeToPacket(packet: NetPacket, time: Optional<Time>): void {
  if (time === null) {
    return packet.w_u8(MAX_U8);
  }

  const [Y, M, D, h, m, s, ms] = time.get(0, 0, 0, 0, 0, 0, 0);

  packet.w_u8(Y - 2000);
  packet.w_u8(M);
  packet.w_u8(D);
  packet.w_u8(h);
  packet.w_u8(m);
  packet.w_u8(s);
  packet.w_u16(ms);
}

/**
 * todo;
 */
export function readTimeFromPacket(reader: NetProcessor): Optional<Time> {
  const Y: number = reader.r_u8();

  if (Y === MAX_U8 || Y === 0) {
    return null;
  }

  const time: Time = game.CTime();

  const M: number = reader.r_u8();
  const D: number = reader.r_u8();
  const h: number = reader.r_u8();
  const m: number = reader.r_u8();
  const s: number = reader.r_u8();
  const ms: number = reader.r_u16();

  time.set(Y + 2000, M, D, h, m, s, ms);

  return time;
}

/**
 * Set current time in level.
 * Creates idle state with multiplied time factor.
 */
export function setCurrentTime(hour: number, min: number, sec: number): void {
  const currentTimeFactor: TRate = level.get_time_factor();
  const currentGameTime: TTimestamp = game.time();

  // todo: Magic constants.
  let currentDay: number = math.floor(currentGameTime / 86_400_000);
  const currentTime: number = currentGameTime - currentDay * 86_400_000;
  let newTime: number = (sec + min * 60 + hour * 3_600) * 1000;

  if (currentTime > newTime) {
    currentDay = currentDay + 1;
  }

  newTime = newTime + currentDay * 86_400_000;

  level.set_time_factor(10_000);

  while (game.time() < newTime) {
    wait();
  }

  level.set_time_factor(currentTimeFactor);
}