import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/** Renders Lumi's text with highlighted formulas ($...$ and $$...$$) in a math typeface. */
export function MathText({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("lumi-rich", className)}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children.replace(/^[ \t]*\$([^$\n]+)\$[ \t]*$/gm, "$$$$$1$$$$")}
      </ReactMarkdown>
    </div>
  );
}
