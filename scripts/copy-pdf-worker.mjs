#!/usr/bin/env node
/**
 * Copies pdf.js runtime assets into /public so the PDF reader can load them
 * from same-origin URLs:
 *   - public/pdf.worker.min.mjs
 *   - public/standard_fonts/*
 *
 * The worker and fonts MUST match the exact pdfjs-dist version that react-pdf
 * loads at runtime (react-pdf pins its own pdfjs-dist). Resolve pdfjs-dist
 * through react-pdf so the copied assets always match the reader's API version
 * even when a different pdfjs-dist is hoisted to the project root.
 *
 * Run automatically via the `postinstall` script so a fresh clone works
 * without manual steps.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const require = createRequire(import.meta.url);
const reactPdfRequire = createRequire(require.resolve("react-pdf/package.json"));
const pdfjsPackagePath = reactPdfRequire.resolve("pdfjs-dist/package.json");
const pdfjsDir = dirname(pdfjsPackagePath);
const pdfjsVersion = require(pdfjsPackagePath).version;

const buildDir = join(pdfjsDir, "build");
const fontsDir = join(pdfjsDir, "standard_fonts");

const workerSources = [join(buildDir, "pdf.worker.min.mjs"), join(buildDir, "pdf.worker.mjs")];
const workerTarget = join(root, "public", "pdf.worker.min.mjs");

const workerSource = workerSources.find((path) => existsSync(path));
if (workerSource) {
  mkdirSync(dirname(workerTarget), { recursive: true });
  copyFileSync(workerSource, workerTarget);
  console.log(`Copied pdf.worker (${pdfjsVersion}) to public/pdf.worker.min.mjs`);
} else {
  console.warn("pdf.worker not found; PDF reader may not work. Run npm install.");
}

if (existsSync(fontsDir)) {
  const target = join(root, "public", "standard_fonts");
  cpSync(fontsDir, target, { recursive: true });
  console.log("Copied pdf.js standard fonts to public/standard_fonts");
}
