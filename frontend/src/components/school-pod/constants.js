import {
  AlertTriangle, Clock, TrendingUp,
} from "lucide-react";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const token = () => localStorage.getItem("capymatch_token");
export const headers = () => ({ Authorization: `Bearer ${token()}` });

export const PRIORITY_ICON = { critical: AlertTriangle, high: AlertTriangle, medium: Clock, info: TrendingUp };
export const PRIORITY_COLOR = { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", info: "#10b981" };
export const SEVERITY_LABEL = { critical: "Critical", high: "High", medium: "Medium", info: "Info" };
export const SEVERITY_BG = { critical: "rgba(239,68,68,0.1)", high: "rgba(245,158,11,0.1)", medium: "rgba(59,130,246,0.1)", info: "rgba(16,185,129,0.1)" };

export const PIPELINE_STAGES = ["Prospect", "Contacted", "Engaged", "Interested", "Visit", "Offer"];

export const STRENGTH_CONFIG = {
  cold:   { label: "Cold",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)", ring: "rgba(148,163,184,0.25)" },
  warm:   { label: "Warm",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)", ring: "rgba(245,158,11,0.25)" },
  active: { label: "Active", color: "#10b981", bg: "rgba(16,185,129,0.1)", ring: "rgba(16,185,129,0.25)" },
  strong: { label: "Strong", color: "#6366f1", bg: "rgba(99,102,241,0.1)", ring: "rgba(99,102,241,0.25)" },
};

export const ACTION_TYPES = [
  { value: "general", label: "General Task" },
  { value: "send_email", label: "Send Email" },
  { value: "log_visit", label: "Log Visit" },
  { value: "log_interaction", label: "Log Interaction" },
  { value: "preparation", label: "Preparation" },
  { value: "profile_update", label: "Profile Update" },
  { value: "research", label: "Research" },
  { value: "reply", label: "Reply to Message" },
];
