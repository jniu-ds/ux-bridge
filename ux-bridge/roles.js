export const USER_ROLES = ["Admin", "Designer", "Product Owner", "Developer", "View Only"];
export const ADMIN_ROLE = "Admin";
export const VIEW_ONLY_ROLE = "View Only";
export const DEFAULT_ROLE = "Designer";

export function normalizeRole(role) {
  const value = String(role ?? "").trim().toLowerCase();
  return USER_ROLES.find((entry) => entry.toLowerCase() === value) || "";
}
