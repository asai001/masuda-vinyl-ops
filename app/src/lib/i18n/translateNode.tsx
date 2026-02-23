import React from "react";

const translatableStringProps = new Set(["placeholder", "label", "title", "aria-label", "helperText", "noOptionsText"]);
const translatableRenderProps = new Set(["renderValue", "renderInput"]);

export const translateNode = (node: React.ReactNode, tx: (text: string) => string): React.ReactNode => {
  if (typeof node === "string") {
    return tx(node);
  }

  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "number") {
    return node;
  }

  if (Array.isArray(node)) {
    let hasChange = false;
    // Preserve React's child keys (including implicit keys for sibling JSX children).
    const translated = React.Children.map(node, (child) => {
      const nextChild = translateNode(child, tx);
      if (nextChild !== child) {
        hasChange = true;
      }
      return nextChild;
    });
    return hasChange ? translated : node;
  }

  if (!React.isValidElement(node)) {
    return node;
  }

  const element = node as React.ReactElement<Record<string, unknown> & { children?: React.ReactNode }>;
  const nextProps: Record<string, unknown> = {};
  let hasPropChange = false;

  for (const [name, value] of Object.entries(element.props)) {
    if (name === "children") {
      continue;
    }
    if (typeof value === "string" && translatableStringProps.has(name)) {
      const translated = tx(value);
      if (translated !== value) {
        nextProps[name] = translated;
        hasPropChange = true;
      }
      continue;
    }
    if (typeof value === "function" && translatableRenderProps.has(name)) {
      const originalRenderer = value as (...args: unknown[]) => React.ReactNode;
      nextProps[name] = (...args: unknown[]) => translateNode(originalRenderer(...args), tx);
      hasPropChange = true;
    }
  }

  const currentChildren = element.props.children;
  const translatedChildren = translateNode(currentChildren, tx);
  const hasChildChange = translatedChildren !== currentChildren;

  if (!hasPropChange && !hasChildChange) {
    return element;
  }

  if (!hasChildChange) {
    return React.cloneElement(element, nextProps);
  }

  return React.cloneElement(element, nextProps, translatedChildren);
};
