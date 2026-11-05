// Mirrored from the kevincho.ca portal (src/components/theme-script.tsx). Keep them
// in sync: both zones share localStorage["theme"] on kevincho.ca.

// Runs in the browser before the page paints (no flash of the wrong theme).
// Modelled on react.dev: use the saved choice if there is one, otherwise the
// OS setting, and keep following OS changes until the visitor picks a theme.
const script = `
(function () {
  var root = document.documentElement;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var saved;
  try {
    saved = localStorage.getItem("theme");
  } catch (err) {}
  // Ignore anything that isn't a valid choice (e.g. an old "system" value)
  if (saved !== "light" && saved !== "dark") saved = null;

  function apply(theme) {
    root.classList.toggle("dark", theme === "dark");
  }

  // Called by the theme toggle button
  window.__setPreferredTheme = function (theme) {
    saved = theme;
    apply(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (err) {}
  };

  apply(saved || (darkQuery.matches ? "dark" : "light"));

  darkQuery.addEventListener("change", function (e) {
    if (!saved) apply(e.matches ? "dark" : "light");
  });
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
