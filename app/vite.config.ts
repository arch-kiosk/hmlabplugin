import { defineConfig, searchForWorkspaceRoot, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import copy from "rollup-plugin-copy";
import packageJson from './package.json';

// noinspection JSUnusedGlobalSymbols
export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, "env");
    return {
        plugins: [
            createHtmlPlugin({
                inject: {
                    ...env,
                },

            }),
        ],
        esbuild:
            command == "build"
                ? {
                      //No console.logs in the distribution
                      drop: ["console", "debugger"],
                  }
                : {},
        build: {
            outDir: "../static/app",
            lib: {
                entry: "src/app.ts",
                formats: ["es"],
            },
            rollupOptions: {
                "external": ["@arch-kiosk/kioskuicomponents"]
            },
        },
        server: {
            fs: {
                strict: true,
                host: true,
            },
        },
        publicDir: "/static",
        html: {
        },
        define: {
            'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
        }
    };
});
