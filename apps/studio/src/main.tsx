import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans";
import "./styles/index.css";
import App from "./app/App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
