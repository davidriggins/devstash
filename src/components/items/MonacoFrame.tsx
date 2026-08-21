"use client";

import { useState } from "react";
import { Editor, loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

import { resolveMonacoLanguage } from "@/lib/monaco-language";

/**
 * Point the loader at the copy in `node_modules` instead of its default CDN.
 *
 * Left alone, `@monaco-editor/react` fetches the editor from jsdelivr at
 * runtime, which means the editor dies offline, behind a proxy, or under a
 * content policy that does not allow the host. Everything in this file is in a
 * lazily-imported chunk, so the megabytes only load when a snippet or command
 * is actually on screen.
 */
loader.config({ monaco });

/**
 * Monaco expects the host to hand it a web worker; without one it warns and
 * runs the editor services on the main thread. Only the base worker is wired
 * up — the language-service workers (TypeScript, JSON, CSS, HTML) exist to
 * provide completions and diagnostics, which are turned off below because a
 * stored snippet is a fragment and would be nothing but red squiggles.
 */
self.MonacoEnvironment = {
  getWorker: () =>
    new Worker(new URL("./monaco.worker.ts", import.meta.url), {
      type: "module",
    }),
};

/**
 * Monaco's own dark theme, with the surfaces removed.
 *
 * The background is transparent so the wrapper's Tailwind classes are the only
 * place the surface colour is written; the app's palette is oklch CSS variables
 * that Monaco cannot read, so anything else would mean hex duplicates of theme
 * colours drifting quietly out of date.
 */
const THEME_NAME = "devstash-dark";

const defineTheme: BeforeMount = (instance) => {
  instance.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#00000000",
      "editorGutter.background": "#00000000",
      "minimap.background": "#00000000",
      "editorLineNumber.foreground": "#ffffff40",
      "editorLineNumber.activeForeground": "#ffffff99",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#00000000",
      // The themed scrollbar: a white wash that lifts on hover, so it reads on
      // the near-black surface without the stock grey slab
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
      "editorOverviewRuler.border": "#00000000",
    },
  });
};

/** Tall enough that a one-line command still looks like an editor */
const MIN_HEIGHT = 88;
const MAX_HEIGHT = 400;

export interface MonacoFrameProps {
  value: string;
  /** Raw `Item.language`, resolved to a Monaco id here */
  language: string | null;
  readOnly: boolean;
  onChange?: (value: string) => void;
  ariaLabel: string;
}

export default function MonacoFrame({
  value,
  language,
  readOnly,
  onChange,
  ariaLabel,
}: MonacoFrameProps) {
  const [height, setHeight] = useState(MIN_HEIGHT);

  /**
   * Monaco does not size itself to its content — it fills whatever box it is
   * given. Growing with the text up to a cap is the whole "fluid height"
   * requirement, so the container height is driven from `getContentHeight()`
   * and clamped here.
   */
  const handleMount: OnMount = (editor) => {
    const syncHeight = () => {
      const content = editor.getContentHeight();
      setHeight(Math.min(Math.max(content, MIN_HEIGHT), MAX_HEIGHT));
    };

    syncHeight();
    editor.onDidContentSizeChange(syncHeight);
  };

  return (
    <div style={{ height }}>
      <Editor
        value={value}
        language={resolveLanguage(language)}
        theme={THEME_NAME}
        beforeMount={defineTheme}
        onMount={handleMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={null}
        options={{
          readOnly,
          domReadOnly: readOnly,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12.5,
          lineHeight: 20,
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: readOnly ? "none" : "line",
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          folding: false,
          // A stored snippet is a fragment, not a program: completions and
          // squiggles here would be noise about missing imports
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          occurrencesHighlight: "off",
          renderWhitespace: "none",
          guides: { indentation: false },
          contextmenu: false,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
            // The editor lives inside a scrolling drawer; consuming the wheel
            // at the top and bottom of the content would trap the page
            alwaysConsumeMouseWheel: false,
          },
          ariaLabel,
        }}
      />
    </div>
  );
}

/**
 * The registry read, which is all this file still owns — the choosing lives in
 * `resolveMonacoLanguage`, where a Node test can reach it.
 */
function resolveLanguage(raw: string | null): string {
  return resolveMonacoLanguage(raw, monaco.languages.getLanguages());
}
