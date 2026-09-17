import { useState } from "react";
import LandingPage from "./pages/LandingPageFull";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoverPage from "./pages/DiscoverPage";
import DashboardPage from "./pages/Dashboardpage";
import AuthPage from "./pages/AuthPage";
import InvestorDashboardPage from "./pages/InvestorDashboardPage";

type Page = "auth" | "landing" | "onboarding" | "discover" | "dashboard" | "investorDashboard";
type Role = "startup" | "investor";

interface UserData {
  role?: string;
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  tagline?: string;
  description?: string;
  stage?: string;
  raise?: string;
  sectors?: string[];
  regions?: string[];
  firm?: string;
  thesis?: string;
  stages?: string[];
  tickets?: string[];
}

export default function App() {
  const initialAuth = (() => {
    try {
      return localStorage.getItem("ff_auth") === "1";
    } catch {
      return false;
    }
  })();

  const initialUser = (() => {
    try {
      const raw = localStorage.getItem("ff_user");
      return raw ? (JSON.parse(raw) as UserData) : {};
    } catch {
      return {};
    }
  })();

  const initialPage: Page = initialAuth
    ? initialUser.role === "investor"
      ? "investorDashboard"
      : "dashboard"
    : "auth";

  const [page, setPage] = useState<Page>(initialPage);
  const [userData, setUserData] = useState<UserData>(initialUser);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);

  const handleNavigate = (target: string, data?: UserData) => {
    if (target === "logout") {
      setIsAuthenticated(false);
      setUserData({});
      setPage("auth");
      localStorage.removeItem("ff_auth");
      localStorage.removeItem("ff_user");
      return;
    }

    if (data) setUserData(prev => ({ ...prev, ...data }));
    if (data) {
      const nextUserData = { ...userData, ...data };
      localStorage.setItem("ff_user", JSON.stringify(nextUserData));
    }

    if (!isAuthenticated && target !== "auth") {
      setPage("auth");
      return;
    }

    if (target === "dashboard") {
      const role = (data?.role || userData.role) as Role | undefined;
      setPage(role === "investor" ? "investorDashboard" : "dashboard");
    } else {
      setPage(target as Page);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAuthSuccess = (authData: { role: Role; name: string; email: string }) => {
    const nextUserData = {
      ...userData,
      role: authData.role,
      name: authData.name,
      email: authData.email,
    };

    setIsAuthenticated(true);
    setUserData(nextUserData);
    localStorage.setItem("ff_auth", "1");
    localStorage.setItem("ff_user", JSON.stringify(nextUserData));
    setPage("onboarding");
  };

  return (
    <div style={{ margin: 0, padding: 0 }}>
      {page === "auth" && (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      )}
      {page === "landing" && (
        <LandingPage onNavigate={handleNavigate} />
      )}
      {page === "onboarding" && (
        <OnboardingPage onNavigate={handleNavigate} />
      )}
      {page === "discover" && (
        <DiscoverPage onNavigate={handleNavigate} userData={userData} />
      )}
      {page === "dashboard" && (
        <DashboardPage onNavigate={handleNavigate} userData={userData} />
      )}
      {page === "investorDashboard" && (
        <InvestorDashboardPage onNavigate={handleNavigate} userData={userData} />
      )}
    </div>
  );
}
