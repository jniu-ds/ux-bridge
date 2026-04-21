import authPageSource from "../legacy-markup/auth-page.html?raw";
import homePageSource from "../projects.html?raw";
import adminPageSource from "../user-management.html?raw";
import profilePageSource from "../profile.html?raw";
import resetPasswordSource from "../reset-password.html?raw";
import overviewPageSource from "../project-overview.html?raw";
import buildingPageSource from "../building-preview.html?raw";
import l1BonusPageSource from "../l1-bonus-preview.html?raw";
import l1l2BonusPageSource from "../l1-l2-bonus-preview.html?raw";
import projectPageSource from "../workspace-page.html?raw";

function extractOuterHtml(source, selector) {
  const documentFragment = new DOMParser().parseFromString(source, "text/html");
  const node = documentFragment.querySelector(selector);

  if (!node) {
    return "";
  }

  return node.outerHTML;
}

export const authPageMarkup = extractOuterHtml(authPageSource, "main.auth-layout");
export const homePageMarkup = extractOuterHtml(homePageSource, "div[data-bridge-shell]");
export const adminPageMarkup = extractOuterHtml(adminPageSource, "div[data-bridge-shell]");
export const profilePageMarkup = extractOuterHtml(profilePageSource, "div[data-bridge-shell]");
export const resetPasswordMarkup = extractOuterHtml(resetPasswordSource, "main.auth-layout");
export const overviewPageMarkup = extractOuterHtml(overviewPageSource, "div[data-bridge-shell]");
export const buildingPageMarkup = extractOuterHtml(buildingPageSource, "div[data-bridge-shell]");
export const l1BonusPageMarkup = extractOuterHtml(l1BonusPageSource, "div[data-bridge-shell]");
export const l1l2BonusPageMarkup = extractOuterHtml(l1l2BonusPageSource, "div[data-bridge-shell]");
export const projectPageMarkup = extractOuterHtml(projectPageSource, "div[data-bridge-shell]");
