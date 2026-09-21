const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

/** Uses Vercel's same-origin `/api` route in production and Vite's proxy locally. */
const API_BASE_URL = configuredApiUrl || "/api";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "The request could not be completed.");
  }

  return response.json() as Promise<T>;
}

export type Startup = { startup_id: string; company_name: string };
export type Investor = { investor_id: string; partner_name: string };
