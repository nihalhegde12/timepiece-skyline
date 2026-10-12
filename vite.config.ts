// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The dev-only devtools plugin tags every JSX element with `data-tsd-source`.
// React Three Fiber treats dashed props as nested paths and crashes, so strip
// the tag from any module that renders R3F scenes.
const stripTsdSourceFromR3F = {
  name: "strip-tsd-source-from-r3f",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!/\.[jt]sx(\?|$)/.test(id)) return;
    if (!code.includes("data-tsd-source")) return;
    if (!/@react-three\/(fiber|drei)/.test(code)) return;
    return { code: code.replace(/\s*data-tsd-source=("[^"]*"|\{[^}]*\})/g, ""), map: null };
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripTsdSourceFromR3F],
  },
});
