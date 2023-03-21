import { CScriptXmlInit, CUIWindow, LuabindClass, XR_CScriptXmlInit } from "xray16";

import { DebugDialog } from "@/engine/core/ui/debug/DebugDialog";
import { LuaLogger } from "@/engine/core/utils/logging";
import { resolveXmlFormPath } from "@/engine/core/utils/ui";

const base: string = "menu\\debug\\DevDebugItemsSection.component";
const logger: LuaLogger = new LuaLogger($filename);

/**
 * todo;
 */
@LuabindClass()
export class DevDebugItemsSection extends CUIWindow {
  public owner: DebugDialog;

  public constructor(owner: DebugDialog) {
    super();

    this.owner = owner;

    this.InitControls();
    this.InitCallBacks();
  }

  public InitControls(): void {
    const xml: XR_CScriptXmlInit = new CScriptXmlInit();

    xml.ParseFile(resolveXmlFormPath(base));
    xml.InitStatic("background", this);
  }

  public InitCallBacks(): void {}
}