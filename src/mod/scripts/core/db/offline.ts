import { Optional, TNumberId } from "@/mod/lib/types";
import { IStoredOfflineObject, registry } from "@/mod/scripts/core/db/registry";

/**
 * todo;
 */
export function hardResetOfflineObject(objectId: TNumberId): void {
  registry.offlineObjects.set(objectId, {
    level_vertex_id: null,
    active_section: null,
  });
}

/**
 * todo;
 */
export function softResetOfflineObject(objectId: TNumberId): void {
  if (registry.offlineObjects.has(objectId)) {
    registry.offlineObjects.set(objectId, {
      level_vertex_id: null,
      active_section: null,
    });
  }
}

/**
 * todo;
 */
export function initializeOfflineObject(objectId: TNumberId): IStoredOfflineObject {
  let offlineRecord: Optional<IStoredOfflineObject> = registry.offlineObjects.get(objectId);

  if (offlineRecord === null) {
    offlineRecord = {
      level_vertex_id: null,
      active_section: null,
    };

    registry.offlineObjects.set(objectId, offlineRecord);
  }

  return offlineRecord;
}