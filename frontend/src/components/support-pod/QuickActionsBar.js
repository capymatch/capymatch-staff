import { useState } from "react";
import { MessageSquare, FileText, CalendarClock, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function QuickActionsBar({ athleteId, athleteName, onRefresh }) {
  const [activeForm, setActiveForm] = useState(null);
  const [formText, setFormText] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => { setActiveForm(null); setFormText(""); };

  const handleSubmit = async () => {
    if (!formText.trim()) return;
    setSaving(true);
    try {
      if (activeForm === "message") {
        await axios.post(`${API}/athletes/${athleteId}/notes`, { text: formText.trim(), tag: "Message" });
        toast.success("Message logged");
      } else if (activeForm === "log") {
        await axios.post(`${API}/athletes/${athleteId}/notes`, { text: formText.trim(), tag: "Check-in" });
        toast.success("Interaction logged");
      } else if (activeForm === "checkin") {
        await axios.post(`${API}/athletes/${athleteId}/notes`, { text: `Scheduled check-in: ${formText.trim()}`, tag: "Check-in" });
        toast.success("Check-in scheduled");
      } else if (activeForm === "escalate") {
        await axios.post(`${API}/athletes/${athleteId}/notes`, { text: `Escalated to Director: ${formText.trim()}`, tag: "Escalation" });
        toast.success("Escalated to Director");
      }
      close();
      onRefresh?.();
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const actions = [
    { key: "message", icon: MessageSquare, label: "Send Message", color: "#3b82f6" },
    { key: "log", icon: FileText, label: "Log Interaction", color: "#10b981" },
    { key: "checkin", icon: CalendarClock, label: "Schedule Check-in", color: "#8b5cf6" },
    { key: "escalate", icon: ArrowUpRight, label: "Escalate to Director", color: "#f59e0b" },
  ];

  const placeholders = {
    message: `Message about ${athleteName || "this athlete"}...`,
    log: "What happened? (call, meeting, email...)",
    checkin: "When and what to check in about...",
    escalate: "Why are you escalating? What do you need from the director?",
  };

  return (
    <div className="sticky top-[49px] sm:top-[57px] z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100" data-testid="quick-actions-bar">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {actions.map(({ key, icon: Icon, label, color }) => (
            <Button
              key={key}
              size="sm"
              variant={activeForm === key ? "default" : "outline"}
              className="rounded-full text-xs gap-1.5 shrink-0 h-8"
              style={activeForm === key ? { backgroundColor: color, borderColor: color, color: "#fff" } : {}}
              onClick={() => activeForm === key ? close() : setActiveForm(key)}
              data-testid={`qa-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        {activeForm && (
          <div className="mt-2 pb-1 flex items-center gap-2" data-testid="qa-form">
            <input
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder={placeholders[activeForm]}
              className="flex-1 min-w-0 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ borderColor: "#e5e7eb" }}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              data-testid="qa-input"
            />
            <Button size="sm" onClick={handleSubmit} disabled={!formText.trim() || saving} className="rounded-full text-xs h-9 shrink-0" data-testid="qa-submit">
              {saving ? "..." : "Send"}
            </Button>
            <button onClick={close} className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0" data-testid="qa-close">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickActionsBar;
