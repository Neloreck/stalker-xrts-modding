import { command_line, LuabindClass, ui_events, XR_CScriptXmlInit, XR_CUIStatic } from "xray16";

import { ProfilingManager } from "@/engine/core/managers/ProfilingManager";
import { AbstractDebugSection } from "@/engine/core/ui/debug/sections/AbstractDebugSection";
import { LuaLogger } from "@/engine/core/utils/logging";
import { resolveXmlFile } from "@/engine/core/utils/ui";
import { TPath } from "@/engine/lib/types";

const base: TPath = "menu\\debug\\DebugGeneralSection.component";
const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
@LuabindClass()
export class DebugGeneralSection extends AbstractDebugSection {
  public uiLuaVersionLabel!: XR_CUIStatic;
  public uiMemoryUsageCountLabel!: XR_CUIStatic;
  public uiProfilingToggleButton!: XR_CUIStatic;
  public uiProfilingReportButton!: XR_CUIStatic;
  public uiLuaJitLabel!: XR_CUIStatic;

  /**
   * todo: Description.
   */
  public initializeControls(): void {
    const xml: XR_CScriptXmlInit = resolveXmlFile(base, this.xml);

    xml.InitStatic("lua_version_label", this);
    xml
      .InitStatic("game_command_line", this)
      .TextControl()
      .SetText("Command line args:" + (command_line() || "unknown"));

    this.uiMemoryUsageCountLabel = xml.InitStatic("memory_usage_count", this);
    this.uiLuaVersionLabel = xml.InitStatic("lua_version_label", this);
    this.uiLuaJitLabel = xml.InitStatic("lua_jit_label", this);
    this.uiProfilingToggleButton = xml.Init3tButton("profiling_toggle_button", this);
    this.uiProfilingReportButton = xml.Init3tButton("profiling_log_button", this);

    this.owner.Register(xml.Init3tButton("refresh_memory_button", this), "refresh_memory_button");
    this.owner.Register(xml.Init3tButton("collect_memory_button", this), "collect_memory_button");
    this.owner.Register(this.uiProfilingToggleButton, "profiling_toggle_button");
    this.owner.Register(this.uiProfilingReportButton, "profiling_log_button");
  }

  /**
   * todo: Description.
   */
  public initializeCallBacks(): void {
    this.owner.AddCallback(
      "refresh_memory_button",
      ui_events.BUTTON_CLICKED,
      () => this.onRefreshMemoryButtonClick(),
      this
    );

    this.owner.AddCallback(
      "collect_memory_button",
      ui_events.BUTTON_CLICKED,
      () => this.onCollectMemoryButtonClick(),
      this
    );

    this.owner.AddCallback(
      "profiling_toggle_button",
      ui_events.BUTTON_CLICKED,
      () => this.onToggleProfilingButtonClick(),
      this
    );
    this.owner.AddCallback(
      "profiling_log_button",
      ui_events.BUTTON_CLICKED,
      () => this.onLogProfilingStatsButtonClick(),
      this
    );
  }

  /**
   * todo: Description.
   */
  public initializeState(): void {
    const profilingManager: ProfilingManager = ProfilingManager.getInstance();

    this.uiMemoryUsageCountLabel.TextControl().SetText(this.getUsedMemoryLabel());
    this.uiLuaVersionLabel.TextControl().SetText("Lua version: " + (_VERSION || "unknown"));
    this.uiLuaJitLabel.TextControl().SetText("JIT " + (jit === null ? "disabled" : "enabled"));
    this.uiProfilingToggleButton
      .TextControl()
      .SetText(profilingManager.isProfilingStarted ? "Stop profiling" : "Start profiling");
    this.uiProfilingReportButton.Enable(profilingManager.isProfilingStarted);
  }

  /**
   * todo: Description.
   */
  public onCollectMemoryButtonClick(): void {
    logger.info("Collect memory garbage");

    ProfilingManager.getInstance().collectLuaGarbage();
    this.uiMemoryUsageCountLabel.TextControl().SetText(this.getUsedMemoryLabel());
  }

  /**
   * todo: Description.
   */
  public onToggleProfilingButtonClick(): void {
    const profilingManager: ProfilingManager = ProfilingManager.getInstance();

    if (profilingManager.isProfilingStarted) {
      profilingManager.clearHook();
    } else {
      profilingManager.setupHook();
    }

    this.uiProfilingReportButton.Enable(profilingManager.isProfilingStarted);
    this.uiProfilingToggleButton
      .TextControl()
      .SetText(profilingManager.isProfilingStarted ? "Stop profiling" : "Start profiling");
  }

  /**
   * todo: Description.
   */
  public onLogProfilingStatsButtonClick(): void {
    const profilingManager: ProfilingManager = ProfilingManager.getInstance();

    if (profilingManager.isProfilingStarted) {
      profilingManager.logCallsCountStats();
    } else {
      logger.info("Profiler manager is disabled");
    }
  }

  /**
   * todo: Description.
   */
  public onRefreshMemoryButtonClick(): void {
    logger.info("Collect memory usage");

    this.uiMemoryUsageCountLabel.TextControl().SetText(this.getUsedMemoryLabel());
  }

  /**
   * todo: Description.
   */
  public getUsedMemoryLabel(): string {
    return string.format("RAM: %.03f MB", ProfilingManager.getInstance().getLuaMemoryUsed() / 1024);
  }
}