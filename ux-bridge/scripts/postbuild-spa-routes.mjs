import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const distDir = path.join(projectRoot, "dist");
const indexPath = path.join(distDir, "index.html");

const routeFiles = [
  "projects.html",
  "home.html",
  "user-management.html",
  "profile.html",
  "admin.html",
  "project-overview.html",
  "overview.html",
  "building-preview.html",
  "building.html",
  "l1-bonus-preview.html",
  "l1-bonus.html",
  "l1-l2-bonus-preview.html",
  "l1-l2-bonus.html",
  "workspace-page.html",
  "project-page.html",
  "reset-password.html",
  "brand-affiliate-project.html",
  "brand-affiliate-mobile.html",
];

const indexHtml = fs.readFileSync(indexPath, "utf8");

for (const routeFile of routeFiles) {
  fs.writeFileSync(path.join(distDir, routeFile), indexHtml);
}

console.log(`Generated SPA route files in ${distDir}`);
