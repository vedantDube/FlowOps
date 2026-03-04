"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { fetchMe } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Capture token from URL (after GitHub OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const orgIdFromUrl = params.get("orgId");

    if (tokenFromUrl) {
      localStorage.setItem("flowops_token", tokenFromUrl);
      if (orgIdFromUrl) localStorage.setItem("flowops_orgId", orgIdFromUrl);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }

    const savedOrgId = localStorage.getItem("flowops_orgId");
    if (savedOrgId) setOrgId(savedOrgId);

    const token = localStorage.getItem("flowops_token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetchMe()
      .then((me) => {
        setUser(me);
        if (!savedOrgId && me.memberships?.[0]) {
          const id = me.memberships[0].organizationId;
          setOrgId(id);
          localStorage.setItem("flowops_orgId", id);
        }

        // Redirect to onboarding if not completed (Feature #4)
        if (
          me.onboardingCompleted === false &&
          !window.location.pathname.startsWith("/onboarding")
        ) {
          window.location.href = "/onboarding";
        }
      })
      .catch(() => {
        localStorage.removeItem("flowops_token");
        localStorage.removeItem("flowops_orgId");
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem("flowops_token");
    localStorage.removeItem("flowops_orgId");
    setUser(null);
    setOrgId(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, orgId, loading, logout, setOrgId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
