import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthStatus } from "@shared/licenseGrant";
import { api } from "./api";

interface LicenseContextValue {
  status: AuthStatus | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<AuthStatus>;
  startWebLogin: () => Promise<AuthStatus>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthStatus>;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

const EMPTY: AuthStatus = {
  configured: false,
  signedIn: false,
  usable: false,
  email: null,
  planName: null,
  expiresAt: null,
  code: "unconfigured",
  message: "Checking license…",
};

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const next = await api().auth.status();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    return api().auth.onChanged((next) => {
      setStatus(next);
      setLoading(false);
      if (next.usable) setError("");
      else if (next.signedIn) setError(next.message);
    });
  }, []);

  const applyStatus = useCallback((next: AuthStatus) => {
    setStatus(next);
    if (next.usable) setError("");
    else if (next.signedIn) setError(next.message);
    return next;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setError("");
      return applyStatus(await api().auth.login(email, password));
    },
    [applyStatus],
  );

  const startWebLogin = useCallback(async () => {
    setError("");
    return applyStatus(await api().auth.startWebLogin());
  }, [applyStatus]);

  const logout = useCallback(async () => {
    setError("");
    setStatus(await api().auth.logout());
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    return applyStatus(await api().auth.refresh());
  }, [applyStatus]);

  const value = useMemo(
    () => ({ status, loading, error, login, startWebLogin, logout, refresh }),
    [status, loading, error, login, startWebLogin, logout, refresh],
  );

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  const value = useContext(LicenseContext);
  if (!value) throw new Error("useLicense must be used inside LicenseProvider");
  return value;
}

export function useLicenseStatus(): AuthStatus {
  return useLicense().status || EMPTY;
}
