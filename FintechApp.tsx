import { useEffect, useState } from "react";
import Landing from "./pages/Landing";
import { AppShell, ROUTES, type RouteId } from "./components/Shell";

function useHashRoute(): string {
  const read = () => window.location.hash.replace(/^#\/?/, "");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export default function FintechApp() {
  const route = useHashRoute();
  const screen = ROUTES.find((r) => r.id === route);
  if (!screen) return <Landing />;

  // Screens are wired one by one from the Figma frames.
  return (
    <AppShell active={screen.id as RouteId}>
      <span className="eyebrow">{screen.kicker}</span>
      <h1>{screen.label}</h1>
      <p className="muted">{screen.sub}</p>
      <div className="card empty">
        <h3>This screen is next.</h3>
        <p className="muted" style={{ fontSize: 13 }}>The design is ready. Its sample data and layout are being wired in.</p>
      </div>
    </AppShell>
  );
}
