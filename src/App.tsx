import { useEffect, useState } from "react";
import { api } from "./api";
import LandingPage from "./pages/LandingPageFull";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoverPage from "./pages/DiscoverPage";
import DashboardPage from "./pages/Dashboardpage";
import AuthPage from "./pages/AuthPage";
import InvestorDashboardPage from "./pages/InvestorDashboardPage";

type Page = "auth" | "landing" | "onboarding" | "discover" | "dashboard" | "investorDashboard";
type Role = "startup" | "investor";

export interface UserData {
  user_id?: string;
  role?: string;
  name?: string;
  email?: string;
  profile_picture?: string;
  startup?: Record<string, any>;
  investor?: Record<string, any>;
}

export default function App() {
  const [page, setPage] = useState<Page>("auth");
  const [userData, setUserData] = useState<UserData>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<UserData>("/auth/me")
      .then((user) => {
        setUserData(user);
        setIsAuthenticated(true);
        setPage(user.role === "investor" && user.investor ? "investorDashboard" : user.role === "startup" && user.startup ? "dashboard" : "onboarding");
      })
      .catch(() => setPage("auth"))
      .finally(() => setLoading(false));
  }, []);

  const handleNavigate = (target: string, data?: UserData) => {
    if (target === "logout") {
      api("/auth/logout", { method: "POST" }).finally(() => {
        setIsAuthenticated(false);
        setUserData({});
        setPage("auth");
      });
      return;
    }

    if (data) setUserData(prev => ({ ...prev, ...data }));

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

  const handleProfileSaved = (data: UserData) => {
    setUserData(data);
    setPage(data.role === "investor" ? "investorDashboard" : "dashboard");
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#03030d" }} />;

  return (
    <div style={{ margin: 0, padding: 0 }}>
      {page === "auth" && (
        <AuthPage />
      )}
      {page === "landing" && (
        <LandingPage onNavigate={handleNavigate} />
      )}
      {page === "onboarding" && (
        <OnboardingPage onNavigate={handleNavigate} onProfileSaved={handleProfileSaved} userData={userData} />
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
