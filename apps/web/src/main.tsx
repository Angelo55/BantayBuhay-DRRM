import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource-variable/outfit/wght.css";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { StyleGuide } from "./styleguide/StyleGuide";

// The style guide needs no account and shows no real data, so it bypasses sign-in.
const page = window.location.pathname === "/styleguide" ? <StyleGuide /> : <App />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">{page}</MotionConfig>
  </StrictMode>,
);
