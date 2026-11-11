import { defineConfig, type Plugin } from "vite";

/**
 * Content Security Policy for the published site. The page may only load its own
 * script, styles and images, plus Google Fonts. Inline scripts, plugins, forms and
 * any other origin are refused by the browser, which limits what an injected or
 * tampered script could do.
 *
 * Added at build time only: the dev server needs inline styles and a websocket.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" },
      { tag: "meta", attrs: { name: "referrer", content: "strict-origin-when-cross-origin" }, injectTo: "head-prepend" },
    ],
  };
}

// Relative base so the build works on GitHub Pages, a custom domain, or opened locally.
export default defineConfig({ base: "./", plugins: [contentSecurityPolicy()] });
