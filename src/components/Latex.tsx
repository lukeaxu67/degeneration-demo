// src/components/Latex.tsx
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  children: string;
}

export function LatexInline({ children }: Props) {
  const html = katex.renderToString(children, {
    throwOnError: false,
    displayMode: false,
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function LatexBlock({ children }: Props) {
  const html = katex.renderToString(children, {
    throwOnError: false,
    displayMode: true,
  });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

