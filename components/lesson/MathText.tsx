import React from "react";
import katex from "katex";
import { renderMath } from "../../public/math-renderer.js";

export interface MathTextProps {
  text?: string | null;
  className?: string;
  inline?: boolean;
  as?: "span" | "div" | "p";
}

export function MathText({
  text,
  className = "",
  inline = true,
  as: Component = inline ? "span" : "div",
}: MathTextProps) {
  if (text == null || text === "") {
    return null;
  }

  const html = renderMath(String(text), katex);

  return (
    <Component
      className={`math-rendered ${inline ? "math-inline" : "math-display"} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MathText;
