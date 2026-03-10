import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import {
  Compass, Users, HeartHandshake, CalendarDays, PenLine,
  Check, ChevronDown, ChevronUp, ArrowRight, Sparkles, X,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEP_ICONS = {
  mission_control: Compass,
  meet_roster: Users,
  support_pod: HeartHandshake,
  events: CalendarDays,
  log_activity: PenLine,
};

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hiding, setHiding] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/onboarding/status`);
      setData(res.data);
      if (res.data.all_done && res.data.show_checklist) {
        setShowSuccess(true);
        setTimeout(() => setHiding(true), 4000);
        setTimeout(() => setData((d) => d ? { ...d, show_checklist: false } : d), 4800);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (user?.role === "club_coach") fetchStatus();
  }, [user, fetchStatus]);

  // Auto-complete "mission_control" on first render
  useEffect(() => {
    if (!data?.show_checklist || !data?.steps) return;
    const mcStep = data.steps.find((s) => s.key === "mission_control");
    if (mcStep && !mcStep.completed) {
      axios.post(`${API}/onboarding/complete-step`, { step: "mission_control" })
        .then(() => fetchStatus())
        .catch(() => {});
    }
  }, [data?.show_checklist]); // eslint-disable-line react-hooks/exhaustive-deps

  const completeStep = async (key) => {
    try {
      await axios.post(`${API}/onboarding/complete-step`, { step: key });
      fetchStatus();
    } catch { /* silent */ }
  };

  const dismiss = async () => {
    setHiding(true);
    setTimeout(async () => {
      try {
        await axios.post(`${API}/onboarding/dismiss`);
        setData((d) => d ? { ...d, show_checklist: false } : d);
      } catch { /* silent */ }
    }, 300);
  };

  const goToStep = (step) => {
    if (step.disabled || !step.route) return;
    if (step.key === "meet_roster" || step.key === "support_pod") {
      // These require deeper interaction — just navigate, completion tracked elsewhere
      navigate(step.route);
    } else {
      completeStep(step.key);
      navigate(step.route);
    }
  };

  const nextIncomplete = data?.steps?.find((s) => !s.completed && !s.disabled);

  if (!data?.show_checklist) return null;

  const { steps, completed_count, total_count } = data;
  const progress = total_count > 0 ? (completed_count / total_count) * 100 : 0;

  // Success state
  if (showSuccess && data.all_done) {
    return (
      <div
        className={`mb-6 transition-all duration-500 ${hiding ? "opacity-0 -translate-y-2" : "opacity-100"}`}
        data-testid="onboarding-success"
      >
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">You're all set!</p>
            <p className="text-xs text-emerald-600">You've completed your onboarding checklist. Time to make an impact.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-6 transition-all duration-300 ${hiding ? "opacity-0 -translate-y-2" : "opacity-100"}`}
      data-testid="onboarding-checklist"
    >
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Compact header — always visible */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
          data-testid="onboarding-toggle"
        >
          <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Getting Started</span>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {completed_count} of {total_count} complete
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="w-32 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {nextIncomplete && !collapsed ? null : nextIncomplete && (
              <span className="text-[10px] text-amber-600 font-medium hidden sm:block">
                Next: {nextIncomplete.label}
              </span>
            )}
            {collapsed ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {/* Expanded checklist */}
        {!collapsed && (
          <div className="border-t border-slate-100 px-5 py-4" data-testid="onboarding-steps">
            <div className="space-y-1">
              {steps.map((step) => {
                const Icon = STEP_ICONS[step.key] || Compass;
                const isNext = nextIncomplete?.key === step.key;
                return (
                  <button
                    key={step.key}
                    onClick={() => goToStep(step)}
                    disabled={step.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group
                      ${step.completed
                        ? "bg-slate-50/50"
                        : step.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : isNext
                            ? "bg-amber-50/60 hover:bg-amber-50"
                            : "hover:bg-slate-50"
                      }`}
                    data-testid={`onboarding-step-${step.key}`}
                  >
                    {/* Completion indicator */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors
                      ${step.completed
                        ? "bg-emerald-100"
                        : isNext
                          ? "bg-amber-100"
                          : "bg-slate-100"
                      }`}
                    >
                      {step.completed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Icon className={`w-3 h-3 ${isNext ? "text-amber-600" : "text-slate-400"}`} />
                      )}
                    </div>

                    {/* Label + description */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${step.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                        {step.label}
                      </span>
                      <p className={`text-[11px] ${step.completed ? "text-slate-300" : "text-slate-400"} truncate`}>
                        {step.description}
                      </p>
                    </div>

                    {/* Action hint */}
                    {!step.completed && !step.disabled && (
                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform
                        ${isNext ? "text-amber-500" : "text-slate-300 opacity-0 group-hover:opacity-100"}
                        group-hover:translate-x-0.5`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer: Next step CTA + dismiss */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              {nextIncomplete ? (
                <button
                  onClick={() => goToStep(nextIncomplete)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  data-testid="onboarding-next-step-btn"
                >
                  <ArrowRight className="w-3 h-3" />
                  Take me to the next step
                </button>
              ) : (
                <span className="text-xs text-emerald-600 font-medium">Almost there!</span>
              )}
              <button
                onClick={dismiss}
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors rounded"
                data-testid="onboarding-dismiss-btn"
              >
                <X className="w-3 h-3" />
                Dismiss for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
