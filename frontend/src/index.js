import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress benign ResizeObserver error overlay in development
const SUPPRESSED = /ResizeObserver loop/;
window.addEventListener("error", (e) => {
  if (SUPPRESSED.test(e.message)) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (e.reason && SUPPRESSED.test(String(e.reason))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

// Patch ResizeObserver to avoid the loop error entirely
const RO = window.ResizeObserver;
if (RO) {
  window.ResizeObserver = class PatchedResizeObserver extends RO {
    constructor(cb) {
      super((entries, observer) => {
        requestAnimationFrame(() => { try { cb(entries, observer); } catch {} });
      });
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
