import * as esbuild from "esbuild";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

import fs from "fs";

console.log("📦 Building frontend (Vite)...");
execSync("npx vite build", { stdio: "inherit", cwd: root });

// Copy _redirects file for Cloudflare Pages SPA routing
try {
  fs.copyFileSync(path.join(root, "client/public/_redirects"), path.join(root, "dist/public/_redirects"));
} catch (e) {}

console.log("🔧 Building backend (esbuild)...");
await esbuild.build({
  entryPoints: [path.join(root, "server/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(root, "dist/index.js"),
  packages: "external",
  alias: {
    "@shared": path.join(root, "shared"),
    "@assets": path.join(root, "attached_assets"),
  },
  // Polyfill __dirname and __filename for ESM
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`.trim(),
  },
});

console.log("✅ Build complete! Output in dist/");
