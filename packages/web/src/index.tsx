import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import App from "./App";
import { ToastProvider } from "./context/ToastContext";
import { ProjectRepositoryProvider } from "./context/ProjectRepositoryContext";

// GitHub Pages SPA redirect support (paired with public/404.html).
// If we were redirected to /<base>/?/<route>, restore the original route.
(() => {
    const l = window.location;
    if (l.search && l.search[1] === "/") {
        const decoded = l.search
            .slice(1)
            .split("&")
            .map((s) => s.replace(/~and~/g, "&"))
            .join("?");

        const basePath = new URL(import.meta.env.BASE_URL, l.origin).pathname.replace(/\/$/, "");
        window.history.replaceState(null, "", basePath + decoded + l.hash);
    }
})();

const rootEl = document.getElementById("root");
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(
    <StrictMode>
        <ToastProvider>
        <ProjectRepositoryProvider>
            <App />
        </ProjectRepositoryProvider>
        </ToastProvider>
    </StrictMode>
    );
}
