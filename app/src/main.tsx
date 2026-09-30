import './monaco-workers'
import React from "react";
import ReactDOM from "react-dom/client";
import Page from "./page";

// Expose Monaco in dev builds for diagnostics, e.g. monaco.editor.getModels().length
if (import.meta.env.DEV) {
  void import('monaco-editor').then(m => {
    (window as unknown as { monaco: unknown }).monaco = m
  })
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
);
