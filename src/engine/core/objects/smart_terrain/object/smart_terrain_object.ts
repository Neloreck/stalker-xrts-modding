import { CGameGraph, game_graph } from "xray16";

import { IRegistryObjectState, registry } from "@/engine/core/database";
import type { TSimulationObject } from "@/engine/core/managers/simulation";
import { getSimulationSquads } from "@/engine/core/managers/simulation/utils";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { ESquadActionType, Squad } from "@/engine/core/objects/squad";
import { GameGraphVertex, GameObject, Optional, ServerCreatureObject, Vector } from "@/engine/lib/types";

/**
 * @param object - server object to check
 * @param terrain - target smart terrain to check reached state
 * @returns whether object has arrived to the smart terrain
 */
export function isObjectArrivedToTerrain(object: ServerCreatureObject, terrain: SmartTerrain): boolean {
  // Do squad based checks for object if possible.
  // todo: Check max u16 instead?
  const squad: Optional<Squad> = object.group_id === null ? null : getSimulationSquads().get(object.group_id);

  if (squad) {
    const isSquadArrived: Optional<boolean> = isSquadArrivedToTerrain(squad);

    // When sure about squad status, return it.
    // Check object otherwise.
    if (isSquadArrived !== null) {
      return isSquadArrived;
    }
  }

  const graph: CGameGraph = game_graph();
  const smartTerrainGameVertex: GameGraphVertex = graph.vertex(terrain.m_game_vertex_id);
  const state: Optional<IRegistryObjectState> = registry.objects.get(object.id) as Optional<IRegistryObjectState>;

  let objectGameVertex: GameGraphVertex;
  let objectPosition: Vector;

  // Check more detailed online object position if possible.
  if (state) {
    const gameObject: GameObject = state.object!;

    objectGameVertex = graph.vertex(gameObject.game_vertex_id());
    objectPosition = gameObject.position();
  } else {
    objectGameVertex = graph.vertex(object.m_game_vertex_id);
    objectPosition = object.position;
  }

  return (
    objectGameVertex.level_id() === smartTerrainGameVertex.level_id() &&
    objectPosition.distance_to_sqr(terrain.position) <= 10_000 // 100 * 100
  );
}

/**
 * @param squad - squad object to check
 * @returns whether object has arrived to the smart terrain
 */
export function isSquadArrivedToTerrain(squad: Squad): Optional<boolean> {
  switch (squad.currentAction?.type) {
    case ESquadActionType.REACH_TARGET: {
      const squadTarget: TSimulationObject =
        registry.simulationObjects.get(squad.assignedTargetId!) ??
        registry.simulator.object<SmartTerrain>(squad.assignedTargetId!)!;

      return squadTarget.isReachedBySimulationObject(squad);
    }

    case ESquadActionType.STAY_ON_TARGET:
      return true;

    default:
      return null;
  }
}
