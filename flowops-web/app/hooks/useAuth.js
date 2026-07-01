"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { fetchMe, logoutRequest } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [mode, setModeState] = useState(null); // "personal" | "org"
  const [loading, setLoading] = useState(true);

  const setMode = (newMode) => {
    setModeState(newMode);
    localStorage.setItem("flowops_mode", newMode);
  };

  useEffect(() => {
    const savedOrgId = localStorage.getItem("flowops_orgId");
    if (savedOrgId) setOrgId(savedOrgId);

    const savedMode = localStorage.getItem("flowops_mode");
    if (savedMode) setModeState(savedMode);

    // Auth is carried via an httpOnly cookie set by the API on OAuth callback;
    // fetchMe() sends it automatically (withCredentials) and fails with 401 if absent.
    fetchMe()
      .then((me) => {
        setUser(me);
        if (!savedOrgId && me.memberships?.[0]) {
          const id = me.memberships[0].organizationId;
          setOrgId(id);
          localStorage.setItem("flowops_orgId", id);
        }

        // Set mode from server preference if not saved locally
        if (!savedMode && me.preferredMode) {
          setModeState(me.preferredMode);
          localStorage.setItem("flowops_mode", me.preferredMode);
        } else if (!savedMode) {
          // No mode selected yet — will show mode selection
          setModeState(null);
        }

        // Redirect to onboarding if not completed (Feature #4)
        if (
          me.onboardingCompleted === false &&
          !window.location.pathname.startsWith("/onboarding") &&
          !window.location.pathname.startsWith("/mode-select")
        ) {
          window.location.href = "/onboarding";
        }
      })
      .catch(() => {
        localStorage.removeItem("flowops_orgId");
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    logoutRequest().finally(() => {
      localStorage.removeItem("flowops_orgId");
      localStorage.removeItem("flowops_mode");
      setUser(null);
      setOrgId(null);
      setModeState(null);
      window.location.href = "/login";
    });
  };

  return (
    <AuthContext.Provider value={{ user, orgId, mode, loading, logout, setOrgId, setMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
