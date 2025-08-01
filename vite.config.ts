import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";
import inlineSveltePlugin from "@hvniel/vite-plugin-svelte-inline-component/plugin";

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      UnoCSS(),
      Icons({ compiler: "svelte" }),
      sveltekit(),
      mode === "test" &&
        inlineSveltePlugin({
          fenceStart: "// svelte:defs",
          fenceEnd: "// sd",
        }),
    ],
    build: {
      minify: mode === "development" ? false : true,
    },
    test: {
      projects: [
        {
          extends: "./vite.config.ts",
          test: {
            name: "client",
            environment: "browser",
            browser: {
              enabled: true,
              provider: "playwright",
              instances: [{ browser: "chromium" }],
            },
            include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
            exclude: ["src/lib/server/**"],
            setupFiles: ["./vitest-setup-client.ts"],
          },
        },
        {
          extends: "./vite.config.ts",
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
