import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { wakeServices } from "@/lib/api";
import App from "./App";
import "./globals.css";

wakeServices();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
