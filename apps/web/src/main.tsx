import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource-variable/outfit/wght.css";
import { MotionConfig, motion } from "motion/react";
import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Landing } from "./landing/Landing";
import { usePath } from "./lib/router";
import { transition, useTheme } from "./ui";

// Only the public landing page loads up front. The console (with its map library and live
// connection), the sign-in page and the style guide load when someone opens them.
const App = lazy(() => import("./App").then((module) => ({ default: module.App })));
const SignIn = lazy(() => import("./components/SignInPage").then((module) => ({ default: module.SignInPage })));
const StyleGuide = lazy(() => import("./styleguide/StyleGuide").then((module) => ({ default: module.StyleGuide })));

const TITLES: Record<string, string> = {
  "/": "BantayBuhay: incident detection and response for Kabankalan City",
  "/login": "Sign in to BantayBuhay",
  "/styleguide": "BantayBuhay design system",
};

function Root() {
  const path = usePath();
  const [firstPath] = useState(window.location.pathname);
  // Applies the saved theme on every page, including the landing page.
  useTheme();
  useEffect(() => {
    document.title = TITLES[path] ?? "BantayBuhay console";
  }, [path]);

  let page;
  if (path === "/") page = <Landing />;
  else if (path === "/login") page = <SignIn />;
  // The style guide needs no account and shows no real data, so it bypasses sign-in.
  else if (path === "/styleguide") page = <StyleGuide />;
  else page = <App />;

  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      {/* Fades only when moving between pages. The first page shows at once, so nothing delays
          its first paint. */}
      <motion.div key={path} initial={path === firstPath ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={transition.fast}>
        {page}
      </motion.div>
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Root />
    </MotionConfig>
  </StrictMode>,
);
