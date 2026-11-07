// Applies a saved dark theme before the first paint, so the page doesn't flash light first.
// A file rather than inline code, so the server's content security policy can stay strict.
try {
  if (localStorage.getItem("bantaybuhay.theme") === "dark") document.documentElement.dataset.theme = "dark";
} catch {
  // Storage blocked: the light default applies.
}
