import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const projectRoot = path.resolve(import.meta.dirname, "..");
const route = process.argv[2] || "l1-bonus-preview.html";
const outputArg = process.argv[3] || path.join("screenshots", route.replace(/\.html$/, ".png"));
const outputPath = path.resolve(projectRoot, outputArg);
const port = process.env.PORT || "4174";
const separator = route.includes("?") ? "&" : "?";
const url = `http://127.0.0.1:${port}/${route}${separator}capture=1`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

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
    url,
  ],
  { stdio: "inherit" },
);

console.log(`Saved screenshot to ${outputPath}`);
