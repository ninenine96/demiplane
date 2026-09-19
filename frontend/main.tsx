import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource/cinzel/400.css";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource-variable/inter";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/400-italic.css";
import "@fontsource/spectral/600.css";
import { App } from "./App";
import "./index.css";

registerSW({ immediate: true });

const container = document.getElementById("root");
if (!container) throw new Error("The demiplane has no root to anchor to.");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
