import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const distDir = path.join(projectRoot, "dist");

const staticFiles = [
  "index.html",
  "reset-password.html",
  "projects.html",
  "user-management.html",
  "project-overview.html",
  "brand-affiliate-project.html",
  "building-preview.html",
  "l1-bonus-preview.html",
  "l1-l2-bonus-preview.html",
  "workspace-page.html",
  "styles.css",
  "capture-mode.js",
  "viewport-scale.js",
  "auth-gate.js",
  "auth-page.js",
  "reset-password.js",
  "customizer.js",
  "estimated-earnings.js",
  "incentive-carousel.js",
  "building-preview.js",
  "admin-users.js",
  "projects-home.js",
  "comments-panel.js",
  "project-page-runtime.js",
  "viewer-presence.js",
];

const staticAliases = [
  ["projects.html", "home.html"],
  ["user-management.html", "admin.html"],
  ["project-overview.html", "overview.html"],
  ["brand-affiliate-project.html", "brand-affiliate-mobile.html"],
  ["building-preview.html", "building.html"],
  ["l1-bonus-preview.html", "l1-bonus.html"],
  ["l1-l2-bonus-preview.html", "l1-l2-bonus.html"],
  ["workspace-page.html", "project-page.html"],
];

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const relativeFile of staticFiles) {
  const sourcePath = path.join(projectRoot, relativeFile);
  const targetPath = path.join(distDir, relativeFile);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

for (const [sourceFile, targetFile] of staticAliases) {
  fs.copyFileSync(path.join(distDir, sourceFile), path.join(distDir, targetFile));
}

fs.writeFileSync(
  path.join(distDir, "favicon.ico"),
  "",
);

console.log(`Static site built to ${distDir}`);
