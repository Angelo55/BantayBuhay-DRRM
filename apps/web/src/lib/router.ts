import { useEffect, useState } from "react";

// A few top-level pages need no router library: the path picks the page, and links between them
// use navigate() so the browser's back button works.

const CHANGE = "bantaybuhay:navigate";

export function navigate(to: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(CHANGE));
  window.scrollTo(0, 0);
}

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    window.addEventListener(CHANGE, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(CHANGE, update);
    };
  }, []);
  return path;
}

// For <a> elements: a normal click navigates in place; modified clicks (new tab) work as usual.
export function linkTo(to: string) {
  return {
    href: to,
    onClick(event: React.MouseEvent<HTMLAnchorElement>) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      navigate(to);
    },
  };
}

export type SignInRole = "operator" | "responder" | "civilian";

export function signInRole(): SignInRole | null {
  const value = new URLSearchParams(window.location.search).get("as");
  return value === "operator" || value === "responder" || value === "civilian" ? value : null;
}
