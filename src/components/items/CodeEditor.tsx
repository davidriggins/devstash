"use client";

import dynamic from "next/dynamic";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Monaco touches `window` as it loads, so it can only ever run in the browser —
 * and it is heavy enough that a note or a link should not pay for it. Splitting
 * the editor out here keeps both true: the chrome below renders immediately
 * from the server, and the editor arrives in its own chunk once it is needed.
 */
const MonacoFrame = dynamic(() => import("@/components/items/MonacoFrame"), {
  ssr: false,
  loading: () => <div className="h-22 animate-pulse bg-white/[0.02]" />,
});

export interface CodeEditorProps {
  value: string;
  /** Raw `Item.language` — shown as typed, resolved to a Monaco id inside */
  language: string | null;
  /** Display mode. Editable when false */
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Names the editor for screen readers, since Monaco owns its own textarea */
  ariaLabel?: string;
}

/**
 * A code surface: macOS window chrome on top, Monaco underneath.
 *
 * Deliberately dark in both app themes. Code reads as a window onto something
 * else — the traffic-light dots make that framing explicit — and the editor
 * carries VS Code's dark token colours, which would be unreadable on a light
 * surface. So the palette here is fixed rather than themed.
 */
export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  ariaLabel = "Code",
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.add({ title: "Copied to clipboard", type: "success" });

      // The icon confirms in place, where the click happened; the toast is for
      // anyone who has already looked away
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({ title: "Could not copy to clipboard", type: "error" });
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101012]">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span aria-hidden className="flex shrink-0 items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {language && (
            <span className="truncate font-mono text-[11px] text-white/40">
              {language}
            </span>
          )}

          {/* type="button": in the drawer this sits inside the edit form, and a
              bare button there would submit it */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            title="Copy"
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-white/50 transition-colors",
              "hover:bg-white/10 hover:text-white/90",
              "focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            {copied ? (
              <Check className="size-3.5 text-[#28c840]" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="sr-only">Copy code</span>
          </button>
        </div>
      </div>

      <MonacoFrame
        value={value}
        language={language}
        readOnly={readOnly}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}
