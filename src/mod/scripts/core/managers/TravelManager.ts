import {
  alife,
  clsid,
  game,
  level,
  patrol,
  relation_registry,
  time_global,
  TXR_cls_id,
  XR_CPhrase,
  XR_CPhraseDialog,
  XR_CPhraseScript,
  XR_cse_alife_object,
  XR_game_object,
  XR_patrol,
  XR_vector,
} from "xray16";

import { post_processors } from "@/mod/globals/animation/post_processors";
import { captions } from "@/mod/globals/captions";
import { communities, TCommunity } from "@/mod/globals/communities";
import { STRINGIFIED_TRUE } from "@/mod/globals/lua";
import { ERelation } from "@/mod/globals/relations";
import { zones } from "@/mod/globals/zones";
import {
  Optional,
  TCount,
  TDirection,
  TDistance,
  TDuration,
  TLabel,
  TName,
  TNumberId,
  TSection,
  TStringId,
  TTimestamp,
} from "@/mod/lib/types";
import { SimSquad } from "@/mod/scripts/core/alife/SimSquad";
import { SmartTerrain } from "@/mod/scripts/core/alife/SmartTerrain";
import { TSimulationObject } from "@/mod/scripts/core/alife/types";
import { registry, TRAVEL_MANAGER_LTX } from "@/mod/scripts/core/database";
import { get_sim_board, SimBoard } from "@/mod/scripts/core/database/SimBoard";
import { AbstractCoreManager } from "@/mod/scripts/core/managers/AbstractCoreManager";
import { NotificationManager } from "@/mod/scripts/core/managers/notifications/NotificationManager";
import { SurgeManager } from "@/mod/scripts/core/managers/SurgeManager";
import { getAlifeCharacterCommunity, getAlifeDistanceBetween, getObjectSquad } from "@/mod/scripts/utils/alife";
import { parseCondList, pickSectionFromCondList } from "@/mod/scripts/utils/configs";
import { abort } from "@/mod/scripts/utils/debug";
import { createScenarioAutoSave } from "@/mod/scripts/utils/game_saves";
import { getObjectBoundSmart } from "@/mod/scripts/utils/gulag";
import { getObjectStoryId } from "@/mod/scripts/utils/ids";
import { LuaLogger } from "@/mod/scripts/utils/logging";

const logger: LuaLogger = new LuaLogger("TravelManager");

/**
 * todo;
 */
export interface ITravelRouteDescriptor {
  phrase_id: string;
  name: string;
  level: string;
  condlist: LuaTable;
}

/**
 * todo;
 */
export class TravelManager extends AbstractCoreManager {
  public static readonly LOCATIONS_LTX_SECTION: TSection = "locations";
  public static readonly TRAVELER_LTX_SECTION: TSection = "traveler";
  public static readonly NAME_LTX_SECTION: TSection = "name";
  public static readonly LEVEL_LTX_SECTION: TSection = "level";
  public static readonly CLOSE_DISTANCE_LTX_SECTION: TSection = "close_distance";

  /**
   * Distance considered too close to travel with group of stalkers.
   */
  public static readonly SMART_TRAVEL_DISTANCE_MIN_THRESHOLD: TDistance = 50;

  /**
   * Duration to delay UI visibility after fast travel.
   */
  public static readonly SMART_TRAVEL_TELEPORT_DELAY: TDuration = 3_000;
  public static readonly SMART_TRAVEL_RESOLVE_DELAY: TDuration = 6_000;

  public readonly smartDescriptionsByName: LuaTable<TName, TLabel> = new LuaTable();
  public readonly smartTravelDescriptorsByName: LuaTable<TName, ITravelRouteDescriptor> = new LuaTable();
  public readonly smartNamesByPhraseId: LuaTable<TName, TStringId> = new LuaTable();

  private travelingStartedAt: Optional<TTimestamp> = null;
  private isTravelTeleported: boolean = false;
  public isTraveling: boolean = false;

  private travelToSmartId: Optional<TNumberId> = null;
  private travelDistance: Optional<TDuration> = null;
  private travelActorPath: Optional<string> = null;
  private travelSquadPath: Optional<string> = null;
  private travelSquad: Optional<SimSquad> = null;

  /**
   * todo;
   */
  public override initialize(): void {
    for (const it of $range(0, TRAVEL_MANAGER_LTX.line_count(TravelManager.LOCATIONS_LTX_SECTION) - 1)) {
      const [temp1, id, value] = TRAVEL_MANAGER_LTX.r_line(TravelManager.LOCATIONS_LTX_SECTION, it, "", "");

      this.smartDescriptionsByName.set(id, value);
    }

    for (const it of $range(0, TRAVEL_MANAGER_LTX.line_count(TravelManager.TRAVELER_LTX_SECTION) - 1)) {
      const [temp1, name, value] = TRAVEL_MANAGER_LTX.r_line(TravelManager.TRAVELER_LTX_SECTION, it, "", "");
      const phraseId: TStringId = tostring(1000 + it);

      this.smartNamesByPhraseId.set(phraseId, name);
      this.smartTravelDescriptorsByName.set(name, {
        name: TRAVEL_MANAGER_LTX.r_string(name, TravelManager.NAME_LTX_SECTION),
        level: TRAVEL_MANAGER_LTX.r_string(name, TravelManager.LEVEL_LTX_SECTION),
        condlist: parseCondList(
          registry.actor,
          name,
          TravelManager.CLOSE_DISTANCE_LTX_SECTION,
          TRAVEL_MANAGER_LTX.r_string(name, "condlist")
        ),
        phrase_id: phraseId,
      });
    }
  }

  public initializeTravellerDialog(dialog: XR_CPhraseDialog): void {
    const npcCommunity: TCommunity = communities.stalker; // -- npc:character_community()

    let actorPhrase: XR_CPhrase = dialog.AddPhrase(captions.dm_traveler_what_are_you_doing, "0", "", -10000);
    let actorScript: XR_CPhraseScript = actorPhrase.GetPhraseScript();

    let npcPhrase: XR_CPhrase = dialog.AddPhrase("if you see this - this is bad", "1", "0", -10000);
    let npcPhraseScript: XR_CPhraseScript = npcPhrase.GetPhraseScript();

    npcPhraseScript.SetScriptText("travel_callbacks.getSquadCurrentActionDescription");

    actorPhrase = dialog.AddPhrase("dm_traveler_can_i_go_with_you", "11", "1", -10000);
    actorScript = actorPhrase.GetPhraseScript();
    actorScript.AddPrecondition("travel_callbacks.canActorMoveWithSquad");

    npcPhrase = dialog.AddPhrase("dm_traveler_" + npcCommunity + "_actor_companion_yes", "111", "11", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.canSquadTakeActor");

    actorPhrase = dialog.AddPhrase("dm_traveler_actor_go_with_squad", "1111", "111", -10000);
    actorScript = actorPhrase.GetPhraseScript();
    actorScript.AddAction("travel_callbacks.onTravelTogetherWithSquad");

    actorPhrase = dialog.AddPhrase("dm_traveler_actor_dont_go_with_squad", "1112", "111", -10000);

    npcPhrase = dialog.AddPhrase("dm_traveler_" + npcCommunity + "_actor_companion_no", "112", "11", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.cannotSquadTakeActor");

    actorPhrase = dialog.AddPhrase("dm_traveler_take_me_to", "12", "1", -10000);

    npcPhrase = dialog.AddPhrase("dm_traveler_" + npcCommunity + "_where_do_you_want", "121", "12", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.canSquadTravel");

    for (const [k, v] of this.smartTravelDescriptorsByName) {
      actorPhrase = dialog.AddPhrase(game.translate_string(v.name) + ".", v.phrase_id, "121", -10000);
      actorScript = actorPhrase.GetPhraseScript();
      actorScript.AddPrecondition("travel_callbacks.canNegotiateTravelToSmart");

      npcPhrase = dialog.AddPhrase("if you see this - this is bad", v.phrase_id + "_1", v.phrase_id, -10000);
      npcPhraseScript = npcPhrase.GetPhraseScript();
      npcPhraseScript.SetScriptText("travel_callbacks.getTravelConst");

      actorPhrase = dialog.AddPhrase("dm_traveler_actor_agree", v.phrase_id + "_11", v.phrase_id + "_1", -10000);
      actorScript = actorPhrase.GetPhraseScript();
      actorScript.AddAction("travel_callbacks.onTravelToSpecificSmartWithSquad");
      actorScript.AddPrecondition("travel_callbacks.isEnoughMoneyToTravel");

      actorPhrase = dialog.AddPhrase("dm_traveler_actor_has_no_money", v.phrase_id + "_13", v.phrase_id + "_1", -10000);
      actorScript = actorPhrase.GetPhraseScript();
      actorScript.AddPrecondition("travel_callbacks.isNotEnoughMoneyToTravel");

      actorPhrase = dialog.AddPhrase("dm_traveler_actor_refuse", v.phrase_id + "_14", v.phrase_id + "_1", -10000);
    }

    dialog.AddPhrase("dm_traveler_actor_refuse", "1211", "121", -10000);

    npcPhrase = dialog.AddPhrase("dm_traveler_" + npcCommunity + "_i_cant_travel", "122", "12", -10000);
    npcPhraseScript = npcPhrase.GetPhraseScript();
    npcPhraseScript.AddPrecondition("travel_callbacks.cannotSquadTravel");

    dialog.AddPhrase("dm_traveler_bye", "13", "1", -10000);
  }

  /**
   * todo;
   */
  public canStartTravelingDialogs(actor: XR_game_object, npc: XR_game_object): boolean {
    const squad: Optional<SimSquad> = getObjectSquad(npc);

    if (squad !== null && squad.commander_id() !== npc.id()) {
      return false;
    } else if (npc.character_community() === communities.bandit) {
      return false;
    } else if (npc.character_community() === communities.army) {
      return false;
    } else if (getObjectBoundSmart(npc)?.name() === zones.jup_b41) {
      return false;
    }

    return true;
  }

  /**
   * todo;
   */
  public isEnemyWithSquadMember(squad: SimSquad): boolean {
    const actorId: TNumberId = alife().actor().id;

    for (const squadMember of squad.squad_members()) {
      if (relation_registry.get_general_goodwill_between(squadMember.id, actorId) <= ERelation.ENEMIES) {
        return true;
      }
    }

    return false;
  }

  /**
   * todo;
   */
  public getSquadCurrentActionDescription(
    actor: XR_game_object,
    npc: XR_game_object,
    dialogId?: TStringId,
    phraseId?: TStringId
  ): TLabel {
    const squad: SimSquad = getObjectSquad(npc)!;
    const squadTargetId: Optional<TNumberId> = squad.assigned_target_id;

    if (squad.current_action === null || squad.current_action.name === "stay_point") {
      return "dm_" + "stalker" + "_doing_nothing_" + tostring(math.random(1, 3)); // -- npc:character_community()
    }

    const targetSquadObject: Optional<TSimulationObject> = alife().object(squadTargetId!);

    if (targetSquadObject === null) {
      abort("SIM TARGET NOT EXIST %s, action_name %s", tostring(squadTargetId), tostring(squad.current_action.name));
    }

    const targetClsId: TXR_cls_id = targetSquadObject.clsid();

    if (targetClsId === clsid.script_actor) {
      abort("Actor talking with squad, which chasing actor.");
    } else if (targetClsId === clsid.online_offline_group_s) {
      return (
        "dm_" + communities.stalker + "_chasing_squad_" + getAlifeCharacterCommunity(targetSquadObject as SimSquad)
      ); // --npc:character_community()
    } else if (targetClsId === clsid.smart_terrain) {
      const smartName: TName = targetSquadObject.name();
      const smartDescription: TLabel = this.smartDescriptionsByName.get(smartName);

      if (smartDescription === null) {
        abort("wrong smart name [%s] in travel_manager.ltx", tostring(smartName));
      }

      return smartDescription;
    } else {
      abort("Wrong target clsid [%s] supplied for travel manager.", tostring(targetClsId));
    }
  }

  /**
   * todo;
   */
  public canActorMoveWithSquad(
    actor: XR_game_object,
    npc: XR_game_object,
    dialogId?: TStringId,
    phraseId?: TStringId
  ): boolean {
    const squad: SimSquad = getObjectSquad(npc)!;

    return !(squad.current_action === null || squad.current_action.name === "stay_point");
  }

  /**
   * todo;
   */
  public canSquadTakeActor(
    npc: XR_game_object,
    actor: XR_game_object,
    dialogId?: TStringId,
    phraseId?: TStringId
  ): boolean {
    const squad: SimSquad = getObjectSquad(npc)!;
    const squadTargetObject: XR_cse_alife_object = alife().object(squad.assigned_target_id!)!;
    const squadTargetClsId: TXR_cls_id = squadTargetObject.clsid();

    return squadTargetClsId === clsid.smart_terrain;
  }

  /**
   * todo;
   */
  public cannotSquadTakeActor(
    npc: XR_game_object,
    actor: XR_game_object,
    dialog_id: TStringId,
    phrase_id: TStringId
  ): boolean {
    return !this.canSquadTakeActor(npc, actor, dialog_id, phrase_id);
  }

  /**
   * todo;
   */
  public isSmartAvailableToReach(smartName: TName, smartTable: ITravelRouteDescriptor, squad: SimSquad): boolean {
    if (smartTable.level !== level.name()) {
      return false;
    }

    const simBoard: SimBoard = get_sim_board();
    const smartTerrain: Optional<SmartTerrain> = simBoard.get_smart_by_name(smartName);

    if (smartTerrain === null) {
      abort("Error in travel manager. Smart [%s] doesnt exist.", tostring(smartName));
    }

    if (pickSectionFromCondList(registry.actor, smartTerrain, smartTable.condlist) !== STRINGIFIED_TRUE) {
      return false;
    }

    if (getAlifeDistanceBetween(squad, smartTerrain) < TravelManager.SMART_TRAVEL_DISTANCE_MIN_THRESHOLD) {
      return false;
    }

    // --     const squad_count = SmartTerrain.smart_terrain_squad_count(board.smarts[smart.id].squads)
    // --     if squad_count !== null and (smart.max_population <= squad_count) then
    // --         return false
    // --     end

    return true;
  }

  /**
   * todo;
   */
  public canSquadTravel(npc: XR_game_object, actor: XR_game_object, dialogId: TStringId, phraseId: TStringId): boolean {
    const squad: SimSquad = getObjectSquad(npc)!;

    // todo: Filter all squads to current level, do not check other locations.
    for (const [id, smartDescriptor] of this.smartTravelDescriptorsByName) {
      if (this.isSmartAvailableToReach(id, smartDescriptor, squad)) {
        return true;
      }
    }

    return false;
  }

  /**
   * todo;
   */
  public cannotSquadTravel(npc: XR_game_object, actor: XR_game_object, dialogId: TStringId, phraseId: TStringId) {
    return !this.canSquadTravel(npc, actor, dialogId, phraseId);
  }

  /**
   * todo;
   */
  public canNegotiateTravelToSmart(
    actor: XR_game_object,
    npc: XR_game_object,
    dialogId: TStringId,
    prevPhraseId: TStringId,
    phraseId: TStringId
  ): boolean {
    const smartName: TName = this.smartNamesByPhraseId.get(phraseId);

    if (smartName === null) {
      abort("Error in travel manager, no available smart name: '%s'.", tostring(phraseId));
    }

    return this.isSmartAvailableToReach(
      smartName,
      this.smartTravelDescriptorsByName.get(smartName),
      getObjectSquad(npc)!
    );
  }

  /**
   * todo;
   */
  public getTravelPriceByDistance(distance: TDistance): TCount {
    return math.ceil(distance / 50) * 50;
  }

  /**
   * todo;
   */
  public getTravelConst(actor: XR_game_object, npc: XR_game_object, dialogId: TStringId, phraseId: TStringId): TLabel {
    const simBoard: SimBoard = get_sim_board();
    const travelPhraseId: TStringId = string.sub(phraseId, 1, string.len(phraseId) - 2);
    const smartName: TName = this.smartNamesByPhraseId.get(travelPhraseId);
    const smartTerrain: Optional<SmartTerrain> = simBoard.get_smart_by_name(smartName)!;

    const distance: TDistance = npc.position().distance_to(smartTerrain.position);
    const price: TCount = this.getTravelPriceByDistance(distance);

    return game.translate_string(captions.dm_traveler_travel_cost) + " " + tostring(price) + ".";
  }

  /**
   * todo;
   */
  public isEnoughMoneyToTravel(
    actor: XR_game_object,
    npc: XR_game_object,
    dialogId: TStringId,
    phraseId: TStringId
  ): boolean {
    const travelPhraseId: TStringId = string.sub(phraseId, 1, string.len(phraseId) - 2);
    const smartName: TName = this.smartNamesByPhraseId.get(travelPhraseId);
    const smart: Optional<SmartTerrain> = get_sim_board().get_smart_by_name(smartName);

    const distance: TDistance = npc.position().distance_to(smart!.position);
    const price: TCount = this.getTravelPriceByDistance(distance);

    return price <= registry.actor.money();
  }

  /**
   * todo;
   */
  public isNotEnoughMoneyToTravel(
    actor: XR_game_object,
    npc: XR_game_object,
    dialogId: TStringId,
    phraseId: TStringId
  ): boolean {
    return !this.isEnoughMoneyToTravel(actor, npc, dialogId, phraseId);
  }

  /**
   * Travel together with squad to selected squad, pay them.
   * todo;
   */
  public onTravelToSpecificSmartWithSquad(
    actor: XR_game_object,
    npc: XR_game_object,
    dialogId: TStringId,
    phraseId: TStringId
  ): void {
    const simBoard: SimBoard = get_sim_board();
    const travelPhraseId: TStringId = string.sub(phraseId, 1, string.len(phraseId) - 3);
    const smartName: TName = this.smartNamesByPhraseId.get(travelPhraseId);
    const smartTerrain: Optional<SmartTerrain> = simBoard.get_smart_by_name(smartName)!;
    const squad: Optional<SimSquad> = getObjectSquad(npc);

    logger.info("Actor travel with squad:", npc.name(), smartName);

    createScenarioAutoSave(captions.st_save_uni_travel_generic);

    npc.stop_talk();

    level.disable_input();
    level.hide_indicators_safe();
    level.add_pp_effector(post_processors.fade_in_out, 613, false);

    // todo: Alife distance vs abs distance.
    const distance: TDistance = getAlifeDistanceBetween(squad!, smartTerrain);
    const price: TCount = this.getTravelPriceByDistance(distance);

    actor.give_money(-price);
    NotificationManager.getInstance().sendMoneyRelocatedNotification(actor, "out", price);

    this.isTravelTeleported = false;
    this.isTraveling = true;

    this.travelActorPath = smartTerrain.traveler_actor_path;
    this.travelSquadPath = smartTerrain.traveler_squad_path;
    this.travelToSmartId = smartTerrain.id;
    this.travelSquad = squad;
    this.travelDistance = distance;
    this.travelingStartedAt = time_global();
  }

  /**
   * Travel together with squad to their assigned goal, just follow them.
   * todo;
   */
  public onTravelTogetherWithSquad(
    actor: XR_game_object,
    npc: XR_game_object,
    dialogId: TStringId,
    phraseId: TStringId
  ): void {
    createScenarioAutoSave(captions.st_save_uni_travel_generic);

    const squad: SimSquad = getObjectSquad(npc)!;
    const squadTargetId = squad.assigned_target_id;
    const smartTerrain: SmartTerrain = alife().object<SmartTerrain>(squadTargetId!)!;

    npc.stop_talk();

    level.disable_input();
    level.hide_indicators_safe();
    level.add_pp_effector(post_processors.fade_in_out, 613, false);

    this.isTravelTeleported = false;
    this.isTraveling = true;

    this.travelDistance = getAlifeDistanceBetween(squad, smartTerrain);
    this.travelActorPath = smartTerrain.traveler_actor_path;
    this.travelSquadPath = smartTerrain.traveler_squad_path;
    this.travelToSmartId = smartTerrain.id;
    this.travelSquad = squad;
    this.travelingStartedAt = time_global();
  }

  /**
   * Tick of active actor update when teleporting from one place to another.
   * todo;
   * todo: Probably add some 'isTraveling' checker with assertion of types.
   */
  public onActiveTravelUpdate(): void {
    // Wait till prepare.
    if (time_global() - (this.travelingStartedAt as number) < TravelManager.SMART_TRAVEL_TELEPORT_DELAY) {
      return;
    }

    if (!this.isTravelTeleported) {
      logger.info("Teleporting actor on travel:", this.travelSquadPath, this.travelActorPath);

      this.isTravelTeleported = true;

      const point: XR_patrol = new patrol(this.travelActorPath!);
      const direction: TDirection = -point.point(1).sub(point.point(0)).getH();
      const board: SimBoard = get_sim_board();

      for (const [k, v] of board.smarts.get(this.travelToSmartId!).squads) {
        if (getObjectStoryId(v.id) === null && this.isEnemyWithSquadMember(v)) {
          board.exit_smart(v, this.travelToSmartId);
          board.remove_squad(v);
        }
      }

      const currentSmartId: Optional<TNumberId> = this.travelSquad!.smart_id;

      if (currentSmartId !== null) {
        board.assign_squad_to_smart(this.travelSquad!, null);
        board.assign_squad_to_smart(this.travelSquad!, currentSmartId);
      }

      const position: XR_vector = new patrol(this.travelSquadPath!).point(0);

      this.travelSquad!.set_squad_position(position!);

      registry.actor.set_actor_direction(direction);
      registry.actor.set_actor_position(point.point(0));

      const timeTookInMinutes: TDuration = this.travelDistance! / 10;
      const hours: TDuration = math.floor(timeTookInMinutes / 60);
      const minutes: TDuration = timeTookInMinutes - hours * 60;

      level.change_game_time(0, hours, minutes);

      SurgeManager.getInstance().isTimeForwarded = true;

      logger.info("Forwarded time on travel:", this.travelSquadPath, this.travelActorPath);
    }

    // Wait till resolve.
    if (time_global() - (this.travelingStartedAt as number) < TravelManager.SMART_TRAVEL_RESOLVE_DELAY) {
      return;
    }

    this.isTraveling = false;

    this.travelingStartedAt = null;
    this.travelActorPath = null;
    this.travelSquadPath = null;
    this.travelSquad = null;
    this.travelDistance = null;
    this.travelToSmartId = null;

    level.show_weapon(true);
    level.enable_input();
    level.show_indicators();
  }
}