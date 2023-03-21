import { JSXNode, JSXXML } from "jsx-xml";

import { normalizeBaseNodeProps } from "#/utils";

import { IBaseXmlNode } from "@/engine/lib/types";

export interface IXrBackgroundProps extends IBaseXmlNode {
  stretch?: boolean;
}

export function XrBackground(props: IXrBackgroundProps): JSXNode {
  const { x, y, width, height, stretch } = normalizeBaseNodeProps(props);

  return JSXXML(props.tag ?? "background", { x, y, width, height, stretch }, props.children ?? null);
}