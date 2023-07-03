import { AnyObject } from "@/engine/lib/types";
import { MockLuaTable } from "@/fixtures/lua/mocks/LuaTable.mock";

/**
 * todo;
 */
export const table = {
  insert: (target: LuaTable, element: unknown) => {
    if (target instanceof Map) {
      target.set(target.size + 1, element);
    } else {
      target.set(target.length() + 1, element);
    }
  },
  concat: (target: AnyObject, char: string) => {
    if (Array.isArray(target)) {
      return target.join(char);
    } else if (target instanceof MockLuaTable) {
      return [...target.values()].join(char);
    } else {
      return Object.values(target).join(char);
    }
  },
};