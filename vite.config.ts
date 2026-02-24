import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  // Example apps (MPA mode)
  return {
    root: "example",
    base: "./",
    build: {
      outDir: resolve(__dirname, "dist-example"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "example/index.html"),
          interactive: resolve(__dirname, "example/interactive/index.html"),
          "plosive-d": resolve(__dirname, "example/plosive-d/index.html"),
        },
      },
    },
    resolve: {
      alias: {
        "cantor-digitalis": resolve(__dirname, "src/index.ts"),
      },
    },
  };
});
