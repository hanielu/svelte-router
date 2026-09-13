import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";
import inlineSveltePlugin from "@hvniel/vite-plugin-svelte-inline-component/plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import svelteConfig from "./svelte.config.js";

export default defineConfig(({ mode }) => {
  return {
    // Library tests must not start the documentation app's SSR/load pipeline.
    // Keep the same compiler and inline fixtures without site styling dependencies.
    plugins:
      mode === "test"
        ? [
            svelte({
              configFile: false,
              preprocess: svelteConfig.preprocess,
              compilerOptions: svelteConfig.compilerOptions,
            }),
            inlineSveltePlugin({
              fenceStart: "// svelte:defs",
              fenceEnd: "// sd",
            }),
          ]
        : [UnoCSS(), Icons({ compiler: "svelte" }), sveltekit()],
    // An explicit tsconfig also covers the inline plugin's virtual modules.
    // `test:unit` syncs Kit's generated paths from svelte.config.js first.
    tsconfig: mode === "test" ? "./tsconfig.json" : undefined,
    resolve: { tsconfigPaths: mode === "test" },
    build: {
      minify: mode === "development" ? false : true,
    },
    test: {
      expect: { requireAssertions: true },
      projects: [
        {
          extends: true,
          test: {
            name: "client",
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [{ browser: "chromium", headless: true }],
            },
            include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
            exclude: ["src/lib/server/**"],
          },
        },
        {
          extends: true,
          test: {
            name: "server",
            environment: "node",
            include: ["src/**/*.{test,spec}.{js,ts}"],
            exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          },
        },
      ],
      coverage: {
        include: ["src"],
      },
    },
  };
});
