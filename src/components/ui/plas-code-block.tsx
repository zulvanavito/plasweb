import type { ReactNode } from "react";

const TS_KEYWORDS = new Set([
  "let",
  "const",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "type",
  "interface",
]);

const TS_TYPES = new Set(["string", "number", "boolean", "void", "console"]);

function highlightLine(line: string): ReactNode[] {
  const commentIndex = line.indexOf("//");
  const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";

  const tokens = codePart.split(
    /("[^"]*"|'[^']*'|\b[a-zA-Z_]\w*\b|\b\d+(?:\.\d+)?\b)/g
  );

  const nodes: ReactNode[] = tokens.map((tok, idx) => {
    if (!tok) return null;
    if (
      (tok.startsWith('"') && tok.endsWith('"')) ||
      (tok.startsWith("'") && tok.endsWith("'"))
    ) {
      return (
        <span key={idx} className="text-[var(--plas-code-string)]">
          {tok}
        </span>
      );
    }
    if (TS_KEYWORDS.has(tok)) {
      return (
        <span key={idx} className="text-[var(--plas-code-keyword)]">
          {tok}
        </span>
      );
    }
    if (TS_TYPES.has(tok)) {
      return (
        <span key={idx} className="text-[var(--plas-code-type)]">
          {tok}
        </span>
      );
    }
    if (/^\d+(?:\.\d+)?$/.test(tok) || tok === "true" || tok === "false") {
      return (
        <span key={idx} className="text-[var(--plas-code-number)]">
          {tok}
        </span>
      );
    }
    return (
      <span key={idx} className="text-[var(--plas-code-text)]">
        {tok}
      </span>
    );
  });

  if (commentPart) {
    nodes.push(
      <span key="comment" className="text-[var(--plas-code-comment)]">
        {commentPart}
      </span>
    );
  }

  return nodes;
}

export function PlasCodeBlock({
  code,
  filename,
}: {
  code: string;
  filename?: string;
}) {
  const lines = code.replace(/\r\n/g, "\n").split("\n");

  return (
    <div className="plas-dark-surface overflow-hidden rounded-[var(--plas-radius-lg)] border border-[var(--plas-code-header)] bg-[var(--plas-code-bg)]">
      <div className="flex h-9 items-center justify-between bg-[var(--plas-code-header)] px-3.5">
        <span className="font-mono text-[11px] font-semibold text-[#CBD5E1]">
          {filename ?? ""}
        </span>
        <span className="font-mono text-[11px] font-semibold tracking-wider text-[#CBD5E1]">
          TYPESCRIPT
        </span>
      </div>
      <div className="overflow-x-auto px-3.5 py-3">
        <table className="w-full border-collapse font-mono text-[13px] leading-[1.55]">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td className="w-8 select-none pr-3 text-right align-top text-[var(--plas-code-comment)]">
                  {idx + 1}
                </td>
                <td className="whitespace-pre text-[var(--plas-code-text)]">
                  {line.length > 0 ? highlightLine(line) : " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QuestionTextRenderer({ text }: { text: string }) {
  const segments = text.split(/(```ts[\s\S]*?```|```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-[var(--plas-text-primary)]">
      {segments.map((seg, idx) => {
        if (!seg.trim()) return null;
        if (seg.startsWith("```")) {
          const code = seg
            .replace(/^```(?:ts|typescript)?\s*\n?/, "")
            .replace(/\n?```$/, "");
          return <PlasCodeBlock key={idx} code={code} />;
        }
        return (
          <p key={idx} className="whitespace-pre-line">
            {seg.trim()}
          </p>
        );
      })}
    </div>
  );
}
