import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  // Library build mode
  if (mode === "lib") {
    return {
      build: {
        lib: {
          entry: resolve(__dirname, "src/index.ts"),
          name: "CantorDigitalis",
          formats: ["es"],
          fileName: "index",
        },
        outDir: "dist",
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
          // No external dependencies to exclude
        },
      },
    };
  }

  // Example app build mode (default)
  return {
    root: "example",
    base: "./",
    build: {
      outDir: resolve(__dirname, "dist-example"),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        "cantor-digitalis": resolve(__dirname, "src/index.ts"),
      },
    },
  };
});
