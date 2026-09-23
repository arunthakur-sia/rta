import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils";

// Agent output is prose (rubric feedback, jury evaluations, etc.), not raw
// HTML — react-markdown renders it into the same block/inline elements the
// rest of the UI already uses (see Card, ScorecardView), instead of the
// literal "**bold**" / "- item" text showing up unrendered in a <p>.
const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink-900">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 ps-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 ps-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  h1: ({ children }) => <h4 className="mb-1 mt-3 font-semibold text-ink-900 first:mt-0">{children}</h4>,
  h2: ({ children }) => <h4 className="mb-1 mt-3 font-semibold text-ink-900 first:mt-0">{children}</h4>,
  h3: ({ children }) => <h4 className="mb-1 mt-3 font-semibold text-ink-900 first:mt-0">{children}</h4>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent-700 underline">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{children}</code>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-s-2 border-border ps-3 italic text-ink-600 last:mb-0">{children}</blockquote>
  ),
};

/** Renders agent-generated markdown prose (evaluations, critiques, feedback) with real formatting instead of literal "**"/"-" characters. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
