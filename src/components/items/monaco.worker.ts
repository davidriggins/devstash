/**
 * The editor's web worker, as its own entry point.
 *
 * This file exists only so the worker can be referenced by a relative path.
 * `new Worker(new URL("monaco-editor/...", import.meta.url))` does not build —
 * the bundler will not resolve a bare package specifier inside `new URL`, and
 * fails with "Module not found". Re-exporting the worker from a local module
 * gives `MonacoFrame` a relative path, which resolves.
 *
 * The specifier looks short by one level on purpose: the package maps
 * `"./*.js"` to `"./esm/vs/*.js"`, so spelling out the real path on disk maps
 * it a second time and resolves to nothing.
 */
import "monaco-editor/editor/editor.worker.js";
