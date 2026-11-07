import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SystemStatus } from "./SystemStatus";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">BantayBuhay</h1>
      <p className="text-slate-300">Kabankalan City incident detection and response</p>
      <SystemStatus />
    </main>
  </StrictMode>,
);
