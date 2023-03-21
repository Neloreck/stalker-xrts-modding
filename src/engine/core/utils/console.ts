import { get_console } from "xray16";

import { TConsoleCommand } from "@/engine/lib/constants/console_commands";
import { AnyArgs } from "@/engine/lib/types";

/**
 * todo;
 */
export function executeConsoleCommand(command: TConsoleCommand, ...args: AnyArgs): void {
  if (args.length > 0) {
    get_console().execute(command + " " + args.join(" "));
  } else {
    get_console().execute(command);
  }
}

/**
 * todo;
 */
export function getConsoleFloatCommand(command: TConsoleCommand, ...args: AnyArgs): number {
  if (args.length > 0) {
    return get_console().get_float(command + " " + args.join(" "));
  } else {
    return get_console().get_float(command);
  }
}