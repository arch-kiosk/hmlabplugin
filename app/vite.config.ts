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
            // copy({
            //   targets: [ { src: '../../kioskfilemakerworkstationplugin/static/kioskfilemakerworkstation.css',
            //     dest:'./kioskfilemakerworkstation/static'
            //   }, {
            //     src: '../../kioskfilemakerworkstationplugin/static/scripts',
            //     dest:'./kioskfilemakerworkstation/static'
            //   }],
            //   hook: 'buildStart'
            // }),
        ],
        // optimizeDeps: {
        //     include: ['../../../../../../kiosktsapplib'],
        // },
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
              // "external": (id) => id.match(/kioskuicomponents/gmi)
                "external": ["@arch-kiosk/kioskuicomponents"]
            },
        },
        server: {
            fs: {
                strict: true,
                host: true,
                allow: [searchForWorkspaceRoot(process.cwd()), "../../../static/scripts/kioskapplib"],
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
