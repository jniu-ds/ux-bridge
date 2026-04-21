import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const projectRoot = path.resolve(import.meta.dirname, "..");
const actualArg = process.argv[2];
const referenceArg = process.argv[3];
const outputArg = process.argv[4] || path.join("screenshots", "diff.png");

if (!actualArg || !referenceArg) {
  console.error("Usage: node scripts/diff.mjs <actual.png> <reference.png> [output.png]");
  process.exit(1);
}

const actualPath = path.resolve(projectRoot, actualArg);
const referencePath = path.resolve(projectRoot, referenceArg);
const outputPath = path.resolve(projectRoot, outputArg);
const htmlPath = path.join(os.tmpdir(), "brand-affiliate-visual-diff.html");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      html, body {
        margin: 0;
        width: 375px;
        height: 812px;
        overflow: hidden;
        background: #000;
      }
      .frame {
        position: relative;
        width: 375px;
        height: 812px;
      }
      img {
        position: absolute;
        inset: 0;
        width: 375px;
        height: 812px;
        object-fit: cover;
      }
      .actual {
        mix-blend-mode: difference;
        opacity: 1;
      }
      .reference {
        opacity: 1;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <img class="reference" src="file://${referencePath}" alt="" />
      <img class="actual" src="file://${actualPath}" alt="" />
    </div>
  </body>
</html>`;

fs.writeFileSync(htmlPath, html);

execFileSync(
  chromePath,
  [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--default-background-color=ffffffff",
    "--window-size=375,812",
    `--screenshot=${outputPath}`,
    `file://${htmlPath}`,
  ],
  { stdio: "inherit" },
);

console.log(`Saved diff to ${outputPath}`);
