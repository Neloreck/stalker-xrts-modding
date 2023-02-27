import {
  connect_error_cb,
  COptionsManager,
  CScriptXmlInit,
  CUIMessageBoxEx,
  CUIScriptWnd,
  CUIWindow,
  DIK_keys,
  Frect,
  game,
  GAME_TYPE,
  get_console,
  level,
  login_operation_cb,
  main_menu,
  SServerFilters,
  TXR_DIK_key,
  TXR_ui_event,
  ui_events,
  XR_CConsole,
  XR_CMainMenu,
  XR_COptionsManager,
  XR_CScriptXmlInit,
  XR_CServerList,
  XR_CUI3tButton,
  XR_CUICheckButton,
  XR_CUIComboBox,
  XR_CUIEditBox,
  XR_CUIEditBoxEx,
  XR_CUIMapList,
  XR_CUIMessageBoxEx,
  XR_CUIProgressBar,
  XR_CUISpinFlt,
  XR_CUISpinNum,
  XR_CUISpinText,
  XR_CUIStatic,
  XR_CUITabControl,
  XR_CUIWindow,
  XR_Patch_Dawnload_Progress,
  XR_profile,
  XR_SServerFilters,
} from "xray16";

import { option_groups } from "@/mod/globals/option_groups";
import { gameConfig } from "@/mod/lib/configs/GameConfig";
import { Optional } from "@/mod/lib/types";
import { MainMenu } from "@/mod/scripts/ui/menu/MainMenu";
import { MultiplayerDemo } from "@/mod/scripts/ui/menu/multiplayer/MultiplayerDemo";
import { MultiplayerJoin } from "@/mod/scripts/ui/menu/multiplayer/MultiplayerJoin";
import { MultiplayerOptions } from "@/mod/scripts/ui/menu/multiplayer/MultiplayerOptions";
import { MultiplayerProfile } from "@/mod/scripts/ui/menu/multiplayer/MultiplayerProfile";
import { MultiplayerServer } from "@/mod/scripts/ui/menu/multiplayer/MultiplayerServer";
import { LuaLogger } from "@/mod/scripts/utils/logging";
import { resolveXmlFormPath } from "@/mod/scripts/utils/ui";

const baseOnline: string = "menu\\multiplayer\\MultiplayerOnline.component";
const baseOffline: string = "menu\\multiplayer\\MultiplayerOffline.component";
const logger: LuaLogger = new LuaLogger("MultiplayerMenu");

/**
 * todo;
 */
@LuabindClass()
export class MultiplayerMenu extends CUIScriptWnd {
  public owner: MainMenu;
  public online: boolean;

  public tab!: XR_CUITabControl;
  public message_box!: XR_CUIMessageBoxEx;
  public cdkey!: XR_CUIEditBox;
  public player_name!: XR_CUIEditBox;

  public dlg_join!: MultiplayerJoin;
  public dlg_options!: MultiplayerOptions;
  public dlg_server!: MultiplayerServer;
  public dlg_demo!: MultiplayerDemo;
  public dlg_profile!: MultiplayerProfile;

  public server_list!: XR_CServerList;
  public map_list!: XR_CUIMapList;
  public btn_direct_ip!: XR_CUI3tButton;
  public filters!: Record<string, XR_CUICheckButton>;
  public spin_max_ping!: XR_CUISpinText;
  public spin_spectator!: XR_CUISpinNum;
  public check_dedicated!: XR_CUICheckButton;
  public check_demosave!: XR_CUICheckButton;
  public check_spectator!: XR_CUICheckButton;
  public check_spec_freefly!: XR_CUICheckButton;
  public check_spec_firsteye!: XR_CUICheckButton;
  public check_spec_lookat!: XR_CUICheckButton;
  public check_spec_freelook!: XR_CUICheckButton;
  public check_spec_teamonly!: XR_CUICheckButton;
  public check_allow_voting!: XR_CUICheckButton;
  public check_auto_team_balance!: XR_CUICheckButton;
  public check_auto_team_swap!: XR_CUICheckButton;
  public check_damage_block!: XR_CUICheckButton;
  public check_friendly_indicators!: XR_CUICheckButton;
  public check_friendly_names!: XR_CUICheckButton;
  public check_no_anmalies!: XR_CUICheckButton;
  public check_pda_hunt!: XR_CUICheckButton;
  public check_activated_return!: XR_CUICheckButton;
  public spin_artreturn_time!: XR_CUISpinNum;
  public spin_anomaly_time!: XR_CUISpinNum;
  public spin_warm_up_time!: XR_CUISpinNum;
  public spin_rate_of_change!: XR_CUISpinFlt;
  public spin_damage_block!: XR_CUISpinNum;
  public spin_frag_limit!: XR_CUISpinNum;
  public spin_time_limit!: XR_CUISpinNum;
  public spin_friendly_fire!: XR_CUISpinFlt;
  public spin_force_respawn!: XR_CUISpinNum;
  public spin_max_players!: XR_CUISpinNum;
  public spin_artefacts_num!: XR_CUISpinNum;
  public spin_artefact_delay!: XR_CUISpinNum;
  public spin_artefact_stay!: XR_CUISpinNum;
  public spin_reinforcement!: XR_CUISpinNum;
  public spin_mode!: XR_CUISpinText;
  public spin_weather!: XR_CUIComboBox;
  public tab_respawn!: XR_CUITabControl;
  public edit_server_name!: XR_CUIEditBoxEx;
  public edit_password!: XR_CUIEditBox;
  public cap_download!: XR_CUIStatic;
  public text_download!: XR_CUIStatic;
  public download_progress!: XR_CUIProgressBar;
  public btn_cancel_download!: XR_CUI3tButton;
  public btn_create!: XR_CUI3tButton;
  public btn_play_demo!: XR_CUI3tButton;
  public btn_join!: XR_CUI3tButton;

  public constructor(owner: MainMenu, isOnlineMode: boolean) {
    super();

    this.owner = owner;
    this.online = isOnlineMode;

    this.InitControls();
    this.InitCallBacks();

    this.tab.SetActiveTab("client");
  }

  public InitControls(): void {
    this.SetWndRect(new Frect().set(0, 0, 1024, 768));

    const xml: XR_CScriptXmlInit = new CScriptXmlInit();

    if (this.online) {
      xml.ParseFile(resolveXmlFormPath(baseOnline));
    } else {
      xml.ParseFile(resolveXmlFormPath(baseOffline));
    }

    xml.InitStatic("background", this);

    this.Enable(true);

    const wrk_area: XR_CUIWindow = new CUIWindow();

    xml.InitWindow("wrk_area", 0, wrk_area);
    wrk_area.SetAutoDelete(true);
    this.AttachChild(wrk_area);

    if (this.online) {
      xml.InitMPPlayerName("edit_player_name", wrk_area);
      xml.InitStatic("cap_cd_key", wrk_area);
      this.cdkey = xml.InitCDkey("edit_cd_key", wrk_area);
      this.Register(this.cdkey, "edit_cd_key");
    } else {
      xml.InitStatic("cap_unique_nick", wrk_area);
      this.player_name = xml.InitEditBox("edit_player_name", wrk_area);
      this.Register(this.player_name, "edit_player_name");
    }

    xml.InitStatic("cap_mode", wrk_area);

    this.dlg_join = new MultiplayerJoin(this.online);
    this.dlg_join.InitControls(0, 0, xml, this);
    wrk_area.AttachChild(this.dlg_join);

    this.dlg_options = new MultiplayerOptions(this.online);
    this.dlg_options.InitControls(0, 0, xml, this);
    this.dlg_options.Show(false);
    wrk_area.AttachChild(this.dlg_options);

    this.dlg_server = new MultiplayerServer();
    this.dlg_server.initialize(0, 0, xml, this);
    this.dlg_server.Show(false);
    wrk_area.AttachChild(this.dlg_server);

    this.dlg_demo = new MultiplayerDemo();
    this.dlg_demo.InitControls(0, 0, xml, this);
    this.dlg_demo.Show(false);
    wrk_area.AttachChild(this.dlg_demo);

    if (this.online) {
      this.dlg_profile = new MultiplayerProfile();
      this.dlg_profile.InitControls(0, 0, xml, this);
      this.dlg_profile.Show(false);
      wrk_area.AttachChild(this.dlg_profile);
    }

    let btn = xml.Init3tButton("btn_create", wrk_area);

    this.Register(btn, "btn_create");
    this.btn_create = btn;
    btn.Enable(false);

    btn = xml.Init3tButton("btn_play_demo", wrk_area);
    this.Register(btn, "btn_play_demo");
    this.btn_play_demo = btn;
    btn.Enable(false);

    btn = xml.Init3tButton("btn_join", wrk_area);
    this.Register(btn, "btn_join");
    this.btn_join = btn;

    btn = xml.Init3tButton("btn_cancel", wrk_area);
    this.Register(btn, "btn_cancel");

    this.tab = xml.InitTab("tab", wrk_area);
    this.Register(this.tab, "tab");

    this.message_box = new CUIMessageBoxEx();
    this.Register(this.message_box, "msg_box");

    this.cap_download = xml.InitStatic("download_static", wrk_area);
    this.text_download = xml.InitStatic("download_text", wrk_area);
    this.download_progress = xml.InitProgressBar("progress_download", wrk_area);
    this.btn_cancel_download = xml.Init3tButton("btn_cancel_download", wrk_area);
    this.Register(this.btn_cancel_download, "btn_cancel_download");

    const version: XR_CUIStatic = xml.InitStatic("static_version", this);
    const mm: XR_CMainMenu = main_menu.get_main_menu();

    version.TextControl().SetText(string.format(gameConfig.VERSION, mm.GetGSVer()));

    if (this.online) {
      this.cdkey.SetText(mm.GetCDKey());
    } else {
      this.player_name.SetText(mm.GetPlayerName());
    }

    this.server_list.SetConnectionErrCb(
      new connect_error_cb(this, (code, description) => this.OnConnectError(code, description))
    );
  }

  public UpdateControls(): void {
    const opt: XR_COptionsManager = new COptionsManager();

    opt.SetCurrentValues(option_groups.mm_mp_client);
    opt.SetCurrentValues(option_groups.mm_mp_server);
    opt.SetCurrentValues(option_groups.mm_mp_srv_filter);

    opt.SaveBackupValues(option_groups.mm_mp_client);
    opt.SaveBackupValues(option_groups.mm_mp_server);
    opt.SaveBackupValues(option_groups.mm_mp_srv_filter);

    this.map_list.ClearList();
    this.map_list.OnModeChange();
    this.dlg_options.SetGameMode(this.map_list.GetCurGameType(), this);

    if (this.online) {
      this.dlg_profile.UpdateControls();
    }

    const mm = main_menu.get_main_menu();

    if (this.online) {
      this.cdkey.SetText(mm.GetCDKey());
    } else {
      this.player_name.SetText(mm.GetPlayerName());
    }

    this.OnGameModeChange();

    if (level.present()) {
      this.btn_create.Enable(false);
      this.btn_join.Enable(false);
      this.btn_direct_ip.Enable(false);
      this.tab.Enable(false);
      this.cdkey.Enable(false);
      // --        this.player_name.Enable    (false)
    }
  }

  public InitCallBacks(): void {
    this.AddCallback("btn_cancel", ui_events.BUTTON_CLICKED, () => this.OnBtn_Calncel(), this);
    this.AddCallback("btn_create", ui_events.BUTTON_CLICKED, () => this.OnBtn_Create(), this);
    this.AddCallback("btn_join", ui_events.BUTTON_CLICKED, () => this.OnBtn_Join(), this);

    this.AddCallback("check_empty", ui_events.BUTTON_CLICKED, () => this.OnFilterChange(), this);
    this.AddCallback("check_full", ui_events.BUTTON_CLICKED, () => this.OnFilterChange(), this);
    this.AddCallback("check_with_pass", ui_events.BUTTON_CLICKED, () => this.OnFilterChange(), this);
    this.AddCallback("check_without_pass", ui_events.BUTTON_CLICKED, () => this.OnFilterChange(), this);
    this.AddCallback("check_without_ff", ui_events.BUTTON_CLICKED, () => this.OnFilterChange(), this);
    this.AddCallback("check_listen_servers", ui_events.BUTTON_CLICKED, () => this.OnFilterChange(), this);

    this.AddCallback("btn_direct_ip", ui_events.BUTTON_CLICKED, () => this.OnBtn_DirectIP(), this);

    // -- ui_mm_mp_options
    this.AddCallback("spin_game_mode", ui_events.LIST_ITEM_SELECT, () => this.OnGameModeChange(), this);

    this.AddCallback("tab", ui_events.TAB_CHANGED, () => this.OnTabChange(), this);
    // -- ui_mm_mp_join
    this.AddCallback("btn_refresh", ui_events.BUTTON_CLICKED, () => this.OnBtn_Refresh(), this);
    this.AddCallback("btn_quick_refresh", ui_events.BUTTON_CLICKED, () => this.OnBtn_RefreshQuick(), this);
    this.AddCallback("btn_server_info", ui_events.BUTTON_CLICKED, () => this.OnBtn_SrvInfo(), this);

    // -- msg_box
    this.AddCallback("msg_box", ui_events.MESSAGE_BOX_YES_CLICKED, () => this.OnDirectIP_yes(), this);

    this.AddCallback("edit_cd_key", ui_events.EDIT_TEXT_COMMIT, () => this.OnCDKeyChanged(), this);
    this.AddCallback("edit_player_name", ui_events.EDIT_TEXT_COMMIT, () => this.OnPlayerNameChanged(), this);

    this.AddCallback("btn_cancel_download", ui_events.BUTTON_CLICKED, () => this.OnBtn_CancelDownload(), this);
    // -- demo playing

    this.AddCallback(
      "demo_list_window",
      ui_events.LIST_ITEM_CLICKED,
      () => this.dlg_demo.SelectDemoFile(),
      this.dlg_demo
    );
    this.AddCallback(
      "demo_list_window",
      ui_events.WINDOW_LBUTTON_DB_CLICK,
      () => this.dlg_demo.PlaySelectedDemo(),
      this.dlg_demo
    );

    this.AddCallback("btn_play_demo", ui_events.BUTTON_CLICKED, () => this.dlg_demo.PlaySelectedDemo(), this.dlg_demo);
    this.AddCallback("demo_file_name", ui_events.EDIT_TEXT_COMMIT, () => this.dlg_demo.OnRenameDemo(), this.dlg_demo);
    this.AddCallback(
      "demo_message_box",
      ui_events.MESSAGE_BOX_YES_CLICKED,
      () => this.dlg_demo.OnMsgBoxYes(),
      this.dlg_demo
    );
    this.AddCallback(
      "demo_message_box",
      ui_events.MESSAGE_BOX_OK_CLICKED,
      () => this.dlg_demo.OnMsgBoxYes(),
      this.dlg_demo
    );

    this.AddCallback("check_demosave", ui_events.BUTTON_CLICKED, () => this.OnDemoSaveChange(), this);
  }

  public OnBtn_DirectIP(): void {
    logger.info("Button direct IP");

    this.message_box.InitMessageBox("message_box_direct_ip");
    this.message_box.ShowDialog(true);
  }

  public OnDirectIP_yes(): void {
    logger.info("On direct API confirm");

    if (string.len(this.message_box.GetHost()) !== 0) {
      // -- const cmd = "start client(" + this.message_box.GetHost() + "/name=" + this.player_name.GetText()
      // + "/psw=" + this.message_box.GetPassword() + ")"
      const cmd: string =
        "start client(" +
        this.message_box.GetHost() +
        "/name=" +
        this.owner.gameSpyProfile!.unique_nick() +
        "/psw=" +
        this.message_box.GetPassword() +
        ")";
      const console: XR_CConsole = get_console();

      console.execute(cmd);
    }
  }

  public OnCDKeyChanged(): void {
    logger.info("CD key changed");

    const cdKey: string = this.cdkey.GetText();
    const console: XR_CConsole = get_console();

    console.execute("cdkey " + (cdKey === "" ? "clear" : cdKey));
  }

  public OnPlayerNameChanged(): void {
    logger.info("Player name changed");

    let tmp_player_name = this.player_name.GetText();

    if (tmp_player_name === "") {
      tmp_player_name = "noname";
      this.message_box.InitMessageBox("message_box_error");
      this.message_box.SetText("mp_nick_name_not_valid");
      this.message_box.ShowDialog(true);
    }

    this.owner.loginManager.set_unique_nick(
      tmp_player_name,
      new login_operation_cb(this, (code, description) => this.ChangeNickOperationResult(code, description))
    );
  }

  public ChangeNickOperationResult(error: unknown, description: string): void {
    // -- assert(profile)
  }

  public OnBtn_SrvInfo(): void {
    logger.info("Server info");

    this.server_list.ShowServerInfo();
  }

  public OnGameModeChange(): void {
    logger.info("Game mode change");

    this.map_list.OnModeChange();
    this.dlg_options.SetGameMode(this.map_list.GetCurGameType(), this);
  }

  public OnFilterChange(): void {
    logger.info("Filter change");

    const sf: XR_SServerFilters = new SServerFilters();

    sf.empty = this.filters.btn_check_empty.GetCheck();
    sf.full = this.filters.btn_check_full.GetCheck();
    sf.with_pass = this.filters.btn_check_with_pass.GetCheck();
    sf.without_pass = this.filters.btn_check_without_pass.GetCheck();
    sf.without_ff = this.filters.btn_check_without_ff.GetCheck();
    sf.listen_servers = this.filters.btn_check_listen_servers.GetCheck();

    this.server_list.SetFilters(sf);
  }

  public OnDemoSaveChange(): void {
    logger.info("Demo save change");

    const console: XR_CConsole = get_console();

    if (this.check_demosave.GetCheck()) {
      console.execute("cl_mpdemosave 1");
    } else {
      console.execute("cl_mpdemosave 0");
    }
  }

  public OnTabChange(): void {
    logger.info("Tab changed");

    this.dlg_join.Show(false);
    this.dlg_options.Show(false);
    this.dlg_server.Show(false);
    this.dlg_demo.Show(false);

    if (this.online) {
      this.dlg_profile.Show(false);
    }

    this.btn_join.Show(false);
    this.btn_create.Show(false);
    this.btn_play_demo.Show(false);

    const id = this.tab.GetActiveId();

    if (id === "client") {
      this.dlg_join.Show(true);
      this.btn_join.Show(true);
    } else if (id === "options") {
      this.dlg_options.Show(true);
      this.btn_create.Show(true);
    } else if (id === "server") {
      this.map_list.LoadMapList();
      this.map_list.OnModeChange();
      this.dlg_server.Show(true);
      this.btn_create.Show(true);
    } else if (id === "demo") {
      this.dlg_demo.FillList();
      this.dlg_demo.Show(true);
      this.btn_play_demo.Show(true);
    } else if (id === "profile") {
      this.dlg_profile.Show(true);
      this.dlg_profile.edit_unique_nick.SetText(this.owner.gameSpyProfile!.unique_nick());
    }
  }

  public OnRadio_NetChanged(): void {
    logger.info("Radio net checked");

    this.server_list.NetRadioChanged(!this.online);
    this.server_list.RefreshList(!this.online);
    this.OnFilterChange();
  }

  public OnBtn_Refresh(): void {
    logger.info("Button refresh");

    this.server_list.RefreshList(!this.online);
    this.OnFilterChange();
  }

  public OnBtn_RefreshQuick(): void {
    logger.info("Button quick refresh");
    this.server_list.RefreshQuick();
  }

  public OnBtn_Calncel(): void {
    logger.info("Button cancel");

    const opt: XR_COptionsManager = new COptionsManager();

    opt.UndoGroup("mm_mp_client");
    opt.UndoGroup("mm_mp_server");
    opt.UndoGroup("mm_mp_srv_filter");

    this.owner.ShowDialog(true);
    this.HideDialog();
    this.owner.Show(true);
  }

  public OnBtn_Create(): void {
    logger.info("Button create");

    if (this.map_list.IsEmpty()) {
      this.message_box.InitMessageBox("select_map");
      this.message_box.ShowDialog(true);

      return;
    }

    const mm: XR_CMainMenu = main_menu.get_main_menu();
    const gs_profile: Optional<XR_profile> = this.owner.loginManager.get_current_profile();

    if (gs_profile && gs_profile.online() && mm.ValidateCDKey() === false) {
      return;
    }

    const opt: XR_COptionsManager = new COptionsManager();

    opt.SaveValues("mm_mp_server");
    opt.SaveValues("mm_mp_client");
    opt.SaveValues("mm_mp_srv_filter");
    this.map_list.SaveMapList();
    this.GatherServerData();
    if (this.check_dedicated.GetCheck()) {
      this.map_list.StartDedicatedServer();
    } else {
      const console: XR_CConsole = get_console();
      const command: string = this.map_list.GetCommandLine(this.owner.gameSpyProfile!.unique_nick());
      // --this.player_name.GetText())

      console.execute("main_menu off");
      console.execute(command);
    }
  }

  public GatherServerData(): void {
    logger.info("Gather server data");

    let cmdstr = "";
    let tmpStr: string;

    // -- server name ------------------------------------------------------------------
    tmpStr = this.edit_server_name.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = "/hname=" + tmpStr;
    }

    // -- password ---------------------------------------------------------------------
    tmpStr = this.edit_password.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/psw=" + tmpStr;
    }

    // -- max players ------------------------------------------------------------------
    tmpStr = this.spin_max_players.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/maxplayers=" + tmpStr;
    }
    // -- public server ----------------------------------------------------------------

    if (this.online === true) {
      cmdstr = cmdstr + "/public=1";
    }

    tmpStr = this.spin_max_ping.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/maxping=" + tmpStr;
    }

    // -- spectator --------------------------------------------------------------------
    if (this.check_spectator.GetCheck()) {
      tmpStr = this.spin_spectator.GetText();
      if (string.len(tmpStr) > 0) {
        cmdstr = cmdstr + "/spectr=" + tmpStr;
      }
    }

    // -- spectator options --
    let tmpNum = 0;

    if (this.check_spec_freefly.GetCheck()) {
      tmpNum = tmpNum + 1;
    }

    if (this.check_spec_firsteye.GetCheck()) {
      tmpNum = tmpNum + 2;
    }

    if (this.check_spec_lookat.GetCheck()) {
      tmpNum = tmpNum + 4;
    }

    if (this.check_spec_freelook.GetCheck()) {
      tmpNum = tmpNum + 8;
    }

    if (this.check_spec_teamonly.GetCheck()) {
      tmpNum = tmpNum + 16;
    }

    cmdstr = cmdstr + "/spectrmds=" + tmpNum;

    // -- allow voting ------------------------------------------------------------------
    const tmpBool: boolean = this.check_allow_voting.GetCheck();

    if (tmpBool === true) {
      cmdstr = cmdstr + "/vote=1";
    }

    // -- damage block ------------------------------------------------------------------
    tmpStr = this.spin_damage_block.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/dmgblock=" + tmpStr;
    }

    if (this.check_damage_block.GetCheck()) {
      cmdstr = cmdstr + "/dmbi=1";
    }

    // -- frag limit ---------------------------------------------------------------------
    tmpStr = this.spin_frag_limit.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/fraglimit=" + tmpStr;
    }

    // -- time limit ---------------------------------------------------------------------
    tmpStr = this.spin_time_limit.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/timelimit=" + tmpStr;
    }

    // -- friendly fire ------------------------------------------------------------------
    tmpStr = this.spin_friendly_fire.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/ffire=" + tmpStr;
    }

    // -- auto team balance --------------------------------------------------------------
    if (this.check_auto_team_balance.GetCheck()) {
      cmdstr = cmdstr + "/abalance=1";
    }

    // -- auto team swap --------------------------------------------------------------
    if (this.check_auto_team_swap.GetCheck()) {
      cmdstr = cmdstr + "/aswap=1";
    }

    // -- Force respawn --------------------------------------------------------------
    if (this.tab_respawn.GetActiveId() === "reinforcement") {
      tmpStr = this.spin_force_respawn.GetText();
      if (string.len(tmpStr) > 0) {
        cmdstr = cmdstr + "/frcrspwn=" + tmpStr;
      }
    }

    // todo: Unepxeted condition? -- ARTEFACTHUNT only ----------------------------------------------
    if ((GAME_TYPE.GAME_UNKNOWN as number) !== 0) {
      if (this.map_list.GetCurGameType() === GAME_TYPE.eGameIDArtefactHunt) {
        // -- number of artefacts ---------------------------------------------------------
        tmpStr = this.spin_artefacts_num.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/anum=" + tmpStr;
        }

        // -- aretefact delay --------------------------------------------------------------
        tmpStr = this.spin_artefact_delay.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/ardelta=" + tmpStr;
        }

        // -- artefact stay ----------------------------------------------------------------
        tmpStr = this.spin_artefact_stay.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/astime=" + tmpStr;
        }

        if (this.tab_respawn.GetActiveId() === "artefactcapture") {
          // -- artefact capture selected
          cmdstr = cmdstr + "/reinf=-1";
        } else {
          tmpStr = this.spin_reinforcement.GetText();
          if (string.len(tmpStr) > 0) {
            cmdstr = cmdstr + "/reinf=" + tmpStr;
          }
        }
      }

      // -- CAPTURETHEARTEFACT only ----------------------------------------------
      if (this.map_list.GetCurGameType() === GAME_TYPE.eGameIDCaptureTheArtefact) {
        // -- number of artefacts ---------------------------------------------------------
        tmpStr = this.spin_artefacts_num.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/anum=" + tmpStr;
        }

        tmpStr = this.spin_reinforcement.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/reinf=" + tmpStr;
        }

        tmpStr = this.spin_artreturn_time.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/artrettime=" + tmpStr;
        }

        if (this.check_activated_return.GetCheck()) {
          cmdstr = cmdstr + "/actret=1";
        }
      }
    } else if ((GAME_TYPE.GAME_UNKNOWN as number) === 0) {
      if (this.map_list.GetCurGameType() === GAME_TYPE.GAME_ARTEFACTHUNT) {
        // -- number of artefacts ---------------------------------------------------------
        tmpStr = this.spin_artefacts_num.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/anum=" + tmpStr;
        }

        // -- aretefact delay --------------------------------------------------------------
        tmpStr = this.spin_artefact_delay.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/ardelta=" + tmpStr;
        }

        // -- artefact stay ----------------------------------------------------------------
        tmpStr = this.spin_artefact_stay.GetText();
        if (string.len(tmpStr) > 0) {
          cmdstr = cmdstr + "/astime=" + tmpStr;
        }

        if (this.tab_respawn.GetActiveId() === "artefactcapture") {
          // -- artefact capture selected
          cmdstr = cmdstr + "/reinf=-1";
        } else {
          tmpStr = this.spin_reinforcement.GetText();
          if (string.len(tmpStr) > 0) {
            cmdstr = cmdstr + "/reinf=" + tmpStr;
          }
        }
      }
    }

    // -- friendly indicators --------------------------------------------------------------
    if (this.check_friendly_indicators.GetCheck()) {
      cmdstr = cmdstr + "/fi=1" + tmpStr;
    }

    // -- friendly indicators --------------------------------------------------------------
    if (this.check_friendly_names.GetCheck()) {
      cmdstr = cmdstr + "/fn=1" + tmpStr;
    }

    // -- anomaly time ---------------------------------------------------------------------
    if (this.check_no_anmalies.GetCheck() === false) {
      tmpStr = this.spin_anomaly_time.GetText();
      if (string.len(tmpStr) > 0) {
        cmdstr = cmdstr + "/ans=1/anslen=" + tmpStr;
      }
    } else {
      cmdstr = cmdstr + "/ans=0";
    }

    // -- pda hunt -------------------------------------------------------------------------
    if (this.check_pda_hunt.GetCheck()) {
      cmdstr = cmdstr + "/pdahunt=1";
    }

    // -- warm up time ---------------------------------------------------------------------
    tmpStr = this.spin_warm_up_time.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/warmup=" + tmpStr;
    }

    // -- rate of weather change -----------------------------------------------------------
    tmpStr = this.spin_rate_of_change.GetText();
    if (string.len(tmpStr) > 0) {
      cmdstr = cmdstr + "/etimef=" + tmpStr;
    }

    this.map_list.SetServerParams(cmdstr);
  }

  public GoToProfileTab(): void {
    logger.info("Go to profile tab");
    this.tab.SetActiveTab("profile");
  }

  public OnConnectError(code: number, description: string): void {
    logger.info("Connection error:", code, description);

    this.message_box.InitMessageBox("message_box_error");

    if (description === "") {
      description = "mp_gp_connect_error";
    }

    this.message_box.SetText(game.translate_string(description));

    // --if    ((err_code === CServerList.ece_unique_nick_not_registred) or
    // --    (err_code === CServerList.ece_unique_nick_expired)) {
    this.GoToProfileTab();
    this.message_box.ShowDialog(true);
  }

  public OnBtn_Join(): void {
    logger.info("Join clicked");

    const opt: XR_COptionsManager = new COptionsManager();

    opt.SaveValues(option_groups.mm_mp_client);
    opt.SaveValues(option_groups.mm_mp_server);
    opt.SaveValues(option_groups.mm_mp_srv_filter);

    this.server_list.SetPlayerName(this.owner.gameSpyProfile!.unique_nick()); // --this.player_name.GetText())
    this.server_list.ConnectToSelected();
  }

  public OnBtn_CancelDownload(): void {
    logger.info("Cancel download");

    main_menu.get_main_menu().CancelDownload();
  }

  public OnKeyboard(key: TXR_DIK_key, action: TXR_ui_event): boolean {
    super.OnKeyboard(key, action);

    if (action === ui_events.WINDOW_KEY_PRESSED) {
      if (key === DIK_keys.DIK_ESCAPE) {
        this.owner.ShowDialog(true); // --new(show main window)
        this.HideDialog();
        this.owner.Show(true);
      }
    }

    return true;
  }

  public Update(): void {
    super.Update();

    const patchDownload: XR_Patch_Dawnload_Progress = main_menu.get_main_menu().GetPatchProgress();

    if (patchDownload.GetInProgress()) {
      this.text_download.Show(true);
      this.cap_download.Show(true);
      this.download_progress.Show(true);

      const _progr: number = patchDownload.GetProgress();

      this.download_progress.SetProgressPos(_progr);

      const str: string = string.format("%.0f%%(%s)", _progr, patchDownload.GetFlieName());

      this.text_download.TextControl().SetText(str);
      this.btn_cancel_download.Show(true);
    } else {
      this.text_download.Show(false);
      this.cap_download.Show(false);
      this.download_progress.Show(false);
      this.btn_cancel_download.Show(false);
    }
  }
}