import { TXR_net_processor, XR_net_packet } from "xray16";

import { registry } from "@/engine/core/database/registry";
import { assert } from "@/engine/core/utils/assertion";
import { LuaLogger } from "@/engine/core/utils/logging";
import { TCount, TName } from "@/engine/lib/types";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo
 */
export function openLoadMarker(reader: TXR_net_processor, markerName: TName): void {
  registry.saveMarkers.set(markerName, reader.r_tell());
}

/**
 * todo
 */
export function closeLoadMarker(reader: TXR_net_processor, markerName: TName): void {
  assert(registry.saveMarkers.get(markerName) !== null, "Trying to check without marker: '%s'", markerName);

  const actualDiff: TCount = reader.r_tell() - registry.saveMarkers.get(markerName);
  const expectedDiff: TCount = reader.r_u16();

  assert(
    expectedDiff === actualDiff,
    "Incorrect load '%s': <dif: %s>, <cdif: %s>.",
    markerName,
    expectedDiff,
    actualDiff
  );
}

/**
 * todo
 */
export function openSaveMarker(packet: XR_net_packet, markerName: TName): void {
  registry.saveMarkers.set(markerName, packet.w_tell());

  assert(packet.w_tell() < 16_000, "You are saving too much in '%s'.", markerName);
}

/**
 * todo
 */
export function closeSaveMarker(packet: XR_net_packet, markerName: TName): void {
  assert(registry.saveMarkers.get(markerName) !== null, "Trying to check without marker: '%s'.", markerName);

  const markerDif: TCount = packet.w_tell() - registry.saveMarkers.get(markerName);

  if (markerDif >= 8000) {
    logger.info("Saving more than 8000:", markerName, markerDif);
  }

  if (markerDif >= 10240) {
    logger.info("Saving more than 10240:", markerName, markerDif);
  }

  packet.w_u16(markerDif);
}