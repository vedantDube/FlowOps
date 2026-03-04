"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Building2, Plus, Check } from "lucide-react";
import { fetchMe } from "@/app/lib/api";

export default function OrgSwitcher() {
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const data = await fetchMe();
        if (data.memberships) {
          setOrgs(data.memberships.map((m) => m.organization));
        }
        const savedOrgId = localStorage.getItem("flowops_orgId");
        if (savedOrgId) setCurrentOrgId(savedOrgId);
      } catch {
        /* silent */
      }
    };
    loadOrgs();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const switchOrg = (orgId) => {
    localStorage.setItem("flowops_orgId", orgId);
    setCurrentOrgId(orgId);
    setOpen(false);
    window.location.reload(); // Refresh to load new org data
  };

  const currentOrg = orgs.find((o) => o.id === currentOrgId);

  if (orgs.length <= 1) return null;

  return (
    <div className="relative px-3" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <Building2 size={14} />
        <span className="flex-1 text-left truncate">
          {currentOrg?.name || "Select Org"}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-[200px] overflow-y-auto">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors ${
                org.id === currentOrgId
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted/60"
              }`}
            >
              <Building2 size={12} />
              <span className="flex-1 text-left truncate">{org.name}</span>
              {org.id === currentOrgId && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
