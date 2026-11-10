import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/** Renders Lumi's text with highlighted formulas ($...$ and $$...$$) in a math typeface. */
export function MathText({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("lumi-rich", className)}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children.replace(/^[ \t]*\$([^$\n]+)\$[ \t]*$/gm, "\n$$$$\n$1\n$$$$\n")}
      </ReactMarkdown>
    </div>
  );
}

/** Same formula rendering for short one-line text (quiz questions, options, flashcards). */
export function MathInline({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("lumi-inline", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children: c }) => <>{c}</> }}
      >
        {String(children ?? "").replace(/\$\$([\s\S]+?)\$\$/g, "$$$1$$")}
      </ReactMarkdown>
    </span>
  );
}
