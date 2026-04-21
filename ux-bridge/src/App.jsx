import { useEffect, useMemo } from "react";
import {
  authPageMarkup,
  adminPageMarkup,
  buildingPageMarkup,
  homePageMarkup,
  l1BonusPageMarkup,
  l1l2BonusPageMarkup,
  overviewPageMarkup,
  profilePageMarkup,
  projectPageMarkup,
  resetPasswordMarkup,
} from "./pageMarkup.js";
import { useLegacyPage } from "./useLegacyPage.js";

function HtmlMarkup({ html }) {
  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function RedirectPage({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

function AuthPage() {
  const scriptLoaders = useMemo(() => [() => import("../auth-page.js")], []);
  useLegacyPage({
    title: "Sign In | UX Bridge",
    bodyClass: "auth-page",
    scriptLoaders,
  });

  return <HtmlMarkup html={authPageMarkup} />;
}

function ResetPasswordPage() {
  const scriptLoaders = useMemo(() => [() => import("../reset-password.js")], []);
  useLegacyPage({
    title: "Reset Password | UX Bridge",
    bodyClass: "auth-page",
    scriptLoaders,
  });

  return <HtmlMarkup html={resetPasswordMarkup} />;
}

function HomePage() {
  const scriptLoaders = useMemo(() => [() => import("../auth-gate.js"), () => import("../projects-home.js")], []);
  useLegacyPage({
    title: "UX Bridge",
    bodyClass: "bridge-body",
    scriptLoaders,
  });

  return <HtmlMarkup html={homePageMarkup} />;
}

function AdminPage() {
  const scriptLoaders = useMemo(() => [() => import("../auth-gate.js"), () => import("../admin-users.js")], []);
  useLegacyPage({
    title: "UX Bridge | Admin",
    bodyClass: "bridge-body",
    bodyDataset: { adminPage: "true" },
    scriptLoaders,
  });

  return <HtmlMarkup html={adminPageMarkup} />;
}

function ProfilePage() {
  const scriptLoaders = useMemo(() => [() => import("../auth-gate.js"), () => import("../profile-page.js")], []);
  useLegacyPage({
    title: "UX Bridge | Profile",
    bodyClass: "bridge-body",
    bodyDataset: { profilePage: "true" },
    scriptLoaders,
  });

  return <HtmlMarkup html={profilePageMarkup} />;
}

function OverviewPage() {
  const scriptLoaders = useMemo(
    () => [
      () => import("../auth-gate.js"),
      () => import("../thumbnail-capture.js"),
      () => import("../project-share.js"),
      () => import("../comments-panel.js"),
    ],
    [],
  );

  useLegacyPage({
    title: "UX Bridge | Brand Affiliate Overview",
    bodyClass: "bridge-body bridge-body--project bridge-body--overview",
    scriptLoaders,
  });

  return <HtmlMarkup html={overviewPageMarkup} />;
}

function BuildingPage() {
  const scriptLoaders = useMemo(
    () => [
      () => import("../auth-gate.js"),
      () => import("../thumbnail-capture.js"),
      () => import("../project-share.js"),
      () => import("../capture-mode.js"),
      () => import("../viewport-scale.js"),
      () => import("../comments-panel.js"),
      () => import("../building-preview.js"),
    ],
    [],
  );

  useLegacyPage({
    title: "UX Bridge | Brand Affiliate Building",
    bodyClass: "bridge-body bridge-body--project",
    scriptLoaders,
  });

  return <HtmlMarkup html={buildingPageMarkup} />;
}

function L1BonusPage() {
  const scriptLoaders = useMemo(
    () => [
      () => import("../auth-gate.js"),
      () => import("../thumbnail-capture.js"),
      () => import("../project-share.js"),
      () => import("../capture-mode.js"),
      () => import("../viewport-scale.js"),
      () => import("../comments-panel.js"),
      () => import("../customizer.js"),
      () => import("../estimated-earnings.js"),
      () => import("../incentive-carousel.js"),
    ],
    [],
  );

  useLegacyPage({
    title: "UX Bridge | L1 Bonus",
    bodyClass: "bridge-body bridge-body--project",
    bodyDataset: { page: "l1" },
    scriptLoaders,
  });

  return <HtmlMarkup html={l1BonusPageMarkup} />;
}

function L1L2BonusPage() {
  const scriptLoaders = useMemo(
    () => [
      () => import("../auth-gate.js"),
      () => import("../thumbnail-capture.js"),
      () => import("../project-share.js"),
      () => import("../capture-mode.js"),
      () => import("../viewport-scale.js"),
      () => import("../comments-panel.js"),
      () => import("../customizer.js"),
      () => import("../estimated-earnings.js"),
      () => import("../incentive-carousel.js"),
    ],
    [],
  );

  useLegacyPage({
    title: "UX Bridge | L1/L2 Bonus",
    bodyClass: "bridge-body bridge-body--project",
    bodyDataset: { page: "l1l2" },
    scriptLoaders,
  });

  return <HtmlMarkup html={l1l2BonusPageMarkup} />;
}

function DynamicProjectPage() {
  const scriptLoaders = useMemo(
    () => [
      () => import("../auth-gate.js"),
      () => import("../thumbnail-capture.js"),
      () => import("../project-share.js"),
      () => import("../capture-mode.js"),
      () => import("../viewport-scale.js"),
      () => import("../project-page-runtime.js"),
      () => import("../vibe-drawer.js"),
      () => import("../comments-panel.js"),
      () => import("../customizer.js"),
    ],
    [],
  );

  useLegacyPage({
    title: "UX Bridge | Project Page",
    bodyClass: "bridge-body bridge-body--project",
    bodyDataset: { dynamicProject: "true" },
    scriptLoaders,
  });

  return <HtmlMarkup html={projectPageMarkup} />;
}

function NotFoundPage() {
  useEffect(() => {
    document.title = "UX Bridge";
    document.body.className = "bridge-body";
    document.documentElement.style.visibility = "visible";
  }, []);

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="auth-card__intro">
          <p className="auth-card__eyebrow">UX Bridge</p>
          <h1>Page not found</h1>
          <p className="auth-card__copy">The page you tried to open does not exist.</p>
        </div>
        <a className="auth-submit" href="/index.html">
          Go to Sign In
        </a>
      </section>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname;

  if (path === "/" || path === "/index.html") {
    return <AuthPage />;
  }

  if (path === "/reset-password.html") {
    return <ResetPasswordPage />;
  }

  if (path === "/home.html") {
    return <RedirectPage to="/projects.html" />;
  }

  if (path === "/projects.html") {
    return <HomePage />;
  }

  if (path === "/admin.html") {
    return <RedirectPage to="/user-management.html" />;
  }

  if (path === "/user-management.html") {
    return <AdminPage />;
  }

  if (path === "/profile.html") {
    return <ProfilePage />;
  }

  if (path === "/overview.html") {
    return <RedirectPage to="/project-overview.html" />;
  }

  if (path === "/project-overview.html") {
    return <OverviewPage />;
  }

  if (path === "/brand-affiliate-mobile.html" || path === "/brand-affiliate-project.html") {
    return <RedirectPage to="/project-overview.html" />;
  }

  if (path === "/building.html") {
    return <RedirectPage to="/building-preview.html" />;
  }

  if (path === "/building-preview.html") {
    return <BuildingPage />;
  }

  if (path === "/l1-bonus.html") {
    return <RedirectPage to="/l1-bonus-preview.html" />;
  }

  if (path === "/l1-bonus-preview.html") {
    return <L1BonusPage />;
  }

  if (path === "/l1-l2-bonus.html") {
    return <RedirectPage to="/l1-l2-bonus-preview.html" />;
  }

  if (path === "/l1-l2-bonus-preview.html") {
    return <L1L2BonusPage />;
  }

  if (path === "/project-page.html") {
    return <RedirectPage to="/workspace-page.html" />;
  }

  if (path === "/workspace-page.html") {
    return <DynamicProjectPage />;
  }

  return <NotFoundPage />;
}
