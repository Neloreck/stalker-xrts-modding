import { alife, time_global, XR_cse_alife_creature_abstract } from "xray16";

import { AnyCallablesModule, Optional } from "@/mod/lib/types";
import { storage } from "@/mod/scripts/core/db";
import { SoundStory } from "@/mod/scripts/core/sound/SoundStory";
import { get_sim_board } from "@/mod/scripts/se/SimBoard";
import { getObjectSquad } from "@/mod/scripts/utils/alife";

const sound_managers: LuaTable<string, SoundManager> = new LuaTable();

export class SoundManager {
  public id: string;
  public npc: LuaTable<number, { npc_id: number }>;
  public storyteller: Optional<number>;
  public story: Optional<SoundStory>;
  public last_playing_npc: Optional<number>;
  public phrase_timeout: Optional<number>;
  public phrase_idle: number;

  public constructor(id: string) {
    this.id = tostring(id);
    this.npc = new LuaTable();
    this.storyteller = null;
    this.story = null;
    this.last_playing_npc = null;
    this.phrase_timeout = null;
    this.phrase_idle = 0;
  }

  public register_npc(npc_id: number): void {
    table.insert(this.npc, { npc_id: npc_id });
  }

  public unregister_npc(npc_id: number): void {
    if (this.last_playing_npc === npc_id && get_global("xr_sound").sound_table[this.last_playing_npc]) {
      this.story = null;
      get_global("xr_sound").sound_table[this.last_playing_npc].stop(npc_id);
    }

    if (this.storyteller === npc_id) {
      this.storyteller = null;
    }

    let remove_id: Optional<number> = null;

    for (const [k, v] of this.npc) {
      if (v.npc_id === npc_id) {
        remove_id = k;
        break;
      }
    }

    if (remove_id !== null) {
      table.remove(this.npc, remove_id);
    }
  }

  public set_storyteller(npc_id: number): void {
    this.storyteller = npc_id;
  }

  public update(): void {
    if (this.story === null) {
      return;
    }

    if (get_global("xr_sound").sound_table[this.last_playing_npc!] !== null) {
      // --printf("wait sound")

      if (storage.get(this.last_playing_npc!) && storage.get(this.last_playing_npc!).object!.best_enemy() !== null) {
        this.story = null;
        get_global("xr_sound").sound_table[this.last_playing_npc!].stop(this.last_playing_npc);
      }

      return;
    }

    const t_global: number = time_global();

    if (this.phrase_timeout == null) {
      this.phrase_timeout = t_global;
    }

    if (t_global - this.phrase_timeout < this.phrase_idle) {
      return;
    }

    const next_phrase = this.story.get_next_phrase();

    if (next_phrase === null) {
      return;
    }

    let npc_id: Optional<number> = null;
    const tn: number = this.npc.length();

    if (tn === 0) {
      // --printf("no npc")
      return;
    }

    if (next_phrase.who === "teller") {
      if (this.storyteller === null) {
        this.choose_random_storyteller();
      }

      npc_id = this.storyteller;
    } else if (next_phrase.who === "reaction") {
      let teller_id = 0;

      for (const [k, v] of this.npc) {
        if (v.npc_id === this.storyteller) {
          teller_id = k;
          break;
        }
      }

      if (tn >= 2) {
        let id: number = math.random(1, tn - 1);

        if (id >= teller_id) {
          id = id + 1;
        }

        npc_id = this.npc.get(id).npc_id;
      } else {
        npc_id = this.npc.get(1).npc_id;
      }
    } else if (next_phrase.who === "reaction_all") {
      let npc_id: Optional<number> = null;

      for (const [k, v] of this.npc) {
        if (v.npc_id !== this.storyteller) {
          get_global<AnyCallablesModule>("xr_sound").set_sound_play(v.npc_id, next_phrase.theme);
          npc_id = v.npc_id;
        }
      }

      this.last_playing_npc = npc_id;
      this.phrase_timeout = null;
      this.phrase_idle = next_phrase.timeout * 1000;

      return;
    } else {
      npc_id = this.npc.get(math.random(1, this.npc.length())).npc_id;
    }

    if (npc_id === null || storage.get(npc_id) === null) {
      return;
    }

    if (storage.get(npc_id).object!.best_enemy() !== null && get_global("xr_sound").sound_table[npc_id] !== null) {
      this.story = null;
      get_global("xr_sound").sound_table[npc_id].stop(npc_id);

      return;
    }

    this.last_playing_npc = npc_id;

    if (next_phrase.theme !== "nil") {
      if (this.story && this.story.id === "squad_counter_attack") {
        const npc = alife().object<XR_cse_alife_creature_abstract>(npc_id);
        const board = get_sim_board();

        if (npc !== null) {
          const our_squad = getObjectSquad(npc);

          if (our_squad !== null) {
            const our_smart = our_squad.smart_id;

            // todo: Never called, no implementation existing.
            const task = null as any; // get_task_manager().get_tasks_by_smart(our_smart);

            if (next_phrase.who !== "teller") {
              const enemy_faction = task.counter_attack_community;

              get_global<AnyCallablesModule>("xr_sound").set_sound_play(npc.id, next_phrase.theme, enemy_faction);
              this.phrase_timeout = null;
              this.phrase_idle = next_phrase.timeout * 1000;

              return;
            }

            get_global<AnyCallablesModule>("xr_sound").set_sound_play(
              npc.id,
              next_phrase.theme,
              our_squad.player_id,
              our_smart
            );
            this.phrase_timeout = null;
            this.phrase_idle = next_phrase.timeout * 1000;

            return;
          }
        }
      }

      get_global<AnyCallablesModule>("xr_sound").set_sound_play(npc_id, next_phrase.theme);
    }

    this.phrase_timeout = null;
    this.phrase_idle = next_phrase.timeout * 1000;
  }

  public choose_random_storyteller(): void {
    this.storyteller = this.npc.get(math.random(1, this.npc.length())).npc_id;
  }

  public is_finished(): boolean {
    if (this.story === null) {
      return true;
    }

    return this.story!.is_finished();
  }

  public set_story(story_id: string): void {
    this.story = new SoundStory(story_id);
  }
}

export function get_sound_manager(id: string) {
  if (sound_managers.get(id) === null) {
    sound_managers.set(id, new SoundManager(id));
  }

  return sound_managers.get(id);
}