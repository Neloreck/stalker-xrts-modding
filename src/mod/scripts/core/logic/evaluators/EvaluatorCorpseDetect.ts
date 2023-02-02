import { level, property_evaluator, XR_game_object, XR_property_evaluator, XR_vector } from "xray16";

import { communities } from "@/mod/globals/communities";
import { Optional } from "@/mod/lib/types";
import { IStoredObject, storage } from "@/mod/scripts/core/db";
import { ActionWoundManager } from "@/mod/scripts/core/logic/ActionWoundManager";
import { get_release_body_manager, IReleaseDescriptor } from "@/mod/scripts/core/ReleaseBodyManager";
import { isLootableItem } from "@/mod/scripts/utils/checkers";

export interface IEvaluatorCorpseDetect extends XR_property_evaluator {
  state: IStoredObject;
}

export const EvaluatorCorpseDetect: IEvaluatorCorpseDetect = declare_xr_class(
  "EvaluatorCorpseDetect",
  property_evaluator,
  {
    __init(name: string, state: IStoredObject): void {
      property_evaluator.__init(this, null, name);
      this.state = state;
    },
    evaluate(): boolean {
      if (!this.object.alive()) {
        return false;
      } else if (this.object.best_enemy() !== null) {
        return false;
      } else if (this.object.character_community() === communities.zombied) {
        return false;
      } else if (this.state.corpse_detection_enabled === false) {
        return false;
      } else if (ActionWoundManager.is_wounded(this.object)) {
        return false;
      } else if (this.object.section() === "actor_visual_stalker") {
        return false;
      }

      const corpses: LuaTable<number, IReleaseDescriptor> = get_release_body_manager().release_objects_table;

      let nearest_corpse_dist_sqr: number = 400;
      let nearest_corpse_vertex: Optional<number> = null;
      let nearest_corpse_position: Optional<XR_vector> = null;
      let corpse_id: Optional<number> = null;

      let hasValuableLoot: boolean = false;
      const checkLoot = (npc: XR_game_object, item: XR_game_object) => {
        if (isLootableItem(item)) {
          hasValuableLoot = true;
        }
      };

      for (const it of $range(1, corpses.length())) {
        const id = corpses.get(it).id;
        const state: Optional<IStoredObject> = storage.get(id);
        const corpse_npc: Optional<XR_game_object> = state !== null ? state.object! : null;

        if (
          corpse_npc &&
          this.object.see(corpse_npc) &&
          (state.corpse_already_selected === null || state.corpse_already_selected === this.object.id())
        ) {
          if (this.object.position().distance_to_sqr(corpse_npc.position()) < nearest_corpse_dist_sqr) {
            hasValuableLoot = false;
            corpse_npc.iterate_inventory(checkLoot, corpse_npc);

            if (hasValuableLoot) {
              const corpse_vertex: number = level.vertex_id(corpse_npc.position());

              if (this.object.accessible(corpse_vertex)) {
                nearest_corpse_dist_sqr = this.object.position().distance_to_sqr(corpse_npc.position());
                nearest_corpse_vertex = corpse_vertex;
                nearest_corpse_position = corpse_npc.position();
                corpse_id = id;
              }
            }
          }
        }
      }

      if (nearest_corpse_vertex !== null) {
        this.state.vertex_id = nearest_corpse_vertex;
        this.state.vertex_position = nearest_corpse_position;

        if (this.state.selected_corpse_id !== null && this.state.selected_corpse_id !== corpse_id) {
          if (storage.get(this.state.selected_corpse_id) !== null) {
            storage.get(this.state.selected_corpse_id).corpse_already_selected = null;
          }
        }

        this.state.selected_corpse_id = corpse_id;
        storage.get(this.state.selected_corpse_id).corpse_already_selected = this.object.id();

        return true;
      }

      return false;
    }
  } as IEvaluatorCorpseDetect
);