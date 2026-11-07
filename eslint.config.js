import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["legacy/**", ".local/**", "**/dist/**", "**/node_modules/**", "**/.venv/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // Plain browser scripts served as files, such as the theme set before the page loads.
    files: ["apps/web/public/**/*.js"],
    languageOptions: {
      globals: { document: "readonly", localStorage: "readonly", window: "readonly" },
    },
  },
  {
    // Plain Node scripts, such as the test database helper.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", fetch: "readonly", URL: "readonly" },
    },
  },
);
