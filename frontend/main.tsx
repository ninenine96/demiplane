import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource/cinzel/400.css";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource-variable/inter";
import { App } from "./App";
import {
  MAX_CONTRAST,
  applyTheme,
  initialThemeId,
  readContrasts,
} from "./lib/themes";
import "./index.css";

registerSW({ immediate: true });

const firstTheme = initialThemeId();
applyTheme(firstTheme, readContrasts()[firstTheme] ?? MAX_CONTRAST);

const container = document.getElementById("root");
if (!container) throw new Error("The demiplane has no root to anchor to.");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
