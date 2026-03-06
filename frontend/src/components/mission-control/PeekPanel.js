import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, FileText, MessageSquare, UserPlus, Clock, ShieldAlert, Users, Target, Zap, AlertTriangle, ExternalLink, ChevronLeft, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_META = {
  momentum_drop: { label: "Momentum Drop", icon: Zap, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  blocker: { label: "Blocker", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  deadline_proximity: { label: "Deadline", icon: Clock, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  engagement_drop: { label: "Engagement Drop", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  ownership_gap: { label: "Unassigned", icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  readiness_issue: { label: "Readiness", icon: Target, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
};

const NOTE_TAGS = ["Check-in", "Follow-up", "Update", "Concern", "Positive"];
const OWNERS = ["Coach Martinez", "Assistant Coach Davis", "Parent/Guardian", "Athlete", "Academic Advisor"];
const RECIPIENTS = ["Parent/Guardian", "Athlete", "Assistant Coach Davis", "Academic Advisor"];

// ─── Inline form: Log Note ───
function NoteForm({ athleteId, onDone, onCancel }) {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/athletes/${athleteId}/notes`, { text: text.trim(), tag: tag || null });
      toast.success("Note logged");
      onDone();
    } catch { toast.error("Failed to save note"); }
    setSaving(false);
  };

  return (
    <div className="space-y-2.5" data-testid="note-form">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" data-testid="note-form-back">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Log Note</span>
      </div>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Quick note..."
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        data-testid="note-form-text"
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        {NOTE_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(tag === t ? "" : t)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              tag === t ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
            data-testid={`note-tag-${t.toLowerCase()}`}
          >
            {t}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!text.trim() || saving}
        className="w-full rounded-full gap-1.5 text-xs"
        data-testid="note-form-submit"
      >
        <Check className="w-3.5 h-3.5" />
        {saving ? "Saving..." : "Save Note"}
      </Button>
    </div>
  );
}

// ─── Inline form: Assign ───
function AssignForm({ athleteId, currentOwner, category, onDone, onCancel }) {
  const [newOwner, setNewOwner] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!newOwner) return;
    setSaving(true);
    try {
      await axios.post(`${API}/athletes/${athleteId}/assign`, {
        new_owner: newOwner,
        reason: reason.trim() || null,
        intervention_category: category,
      });
      toast.success(`Assigned to ${newOwner}`);
      onDone();
    } catch { toast.error("Failed to assign"); }
    setSaving(false);
  };

  return (
    <div className="space-y-2.5" data-testid="assign-form">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" data-testid="assign-form-back">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reassign Owner</span>
      </div>
      {currentOwner && (
        <p className="text-xs text-gray-500">Current: <span className="font-medium text-gray-700">{currentOwner}</span></p>
      )}
      <div className="flex flex-col gap-1.5">
        {OWNERS.filter((o) => o !== currentOwner).map((owner) => (
          <button
            key={owner}
            onClick={() => setNewOwner(newOwner === owner ? "" : owner)}
            className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
              newOwner === owner
                ? "bg-primary/5 border-primary text-primary font-medium"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
            data-testid={`assign-option-${owner.toLowerCase().replace(/[/\s]/g, "-")}`}
          >
            {owner}
          </button>
        ))}
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        data-testid="assign-form-reason"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!newOwner || saving}
        className="w-full rounded-full gap-1.5 text-xs"
        data-testid="assign-form-submit"
      >
        <Check className="w-3.5 h-3.5" />
        {saving ? "Assigning..." : "Confirm Assignment"}
      </Button>
    </div>
  );
}

// ─── Inline form: Message ───
function MessageForm({ athleteId, onDone, onCancel }) {
  const [recipient, setRecipient] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (recipient) inputRef.current?.focus(); }, [recipient]);

  const handleSubmit = async () => {
    if (!recipient || !text.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/athletes/${athleteId}/messages`, { recipient, text: text.trim() });
      toast.success(`Message sent to ${recipient}`);
      onDone();
    } catch { toast.error("Failed to send message"); }
    setSaving(false);
  };

  return (
    <div className="space-y-2.5" data-testid="message-form">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" data-testid="message-form-back">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Message</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {RECIPIENTS.map((r) => (
          <button
            key={r}
            onClick={() => setRecipient(recipient === r ? "" : r)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              recipient === r
                ? "bg-primary text-white border-primary"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
            data-testid={`message-recipient-${r.toLowerCase().replace(/[/\s]/g, "-")}`}
          >
            {r}
          </button>
        ))}
      </div>
      {recipient && (
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message to ${recipient}...`}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          data-testid="message-form-text"
        />
      )}
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!recipient || !text.trim() || saving}
        className="w-full rounded-full gap-1.5 text-xs"
        data-testid="message-form-submit"
      >
        <Send className="w-3.5 h-3.5" />
        {saving ? "Sending..." : "Send Message"}
      </Button>
    </div>
  );
}


// ─── Main PeekPanel ───
function PeekPanel({ intervention, onClose }) {
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState(null); // null | "note" | "assign" | "message"

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (activeAction) setActiveAction(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, activeAction]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        if (activeAction) setActiveAction(null);
        else onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClickOutside); };
  }, [onClose, activeAction]);

  // Reset action when intervention changes
  useEffect(() => { setActiveAction(null); }, [intervention]);

  if (!intervention) return null;

  const meta = CATEGORY_META[intervention.category] || CATEGORY_META.momentum_drop;
  const Icon = meta.icon;
  const details = intervention.details || {};

  const handleActionDone = () => setActiveAction(null);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60] transition-opacity duration-200" data-testid="peek-backdrop" />

      <div
        ref={panelRef}
        data-testid="peek-panel"
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{meta.label}</p>
              <h3 className="font-semibold text-gray-900 text-sm leading-tight" data-testid="peek-athlete-name">
                {intervention.athlete_name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            data-testid="peek-close-btn"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{intervention.grad_year}</span>
            <span>·</span>
            <span>{intervention.position}</span>
            <span>·</span>
            <span>{intervention.team}</span>
            <span>·</span>
            <span>{intervention.school_targets} target schools</span>
          </div>

          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Why this surfaced</h4>
            <p className="text-sm text-gray-800 leading-relaxed" data-testid="peek-why">{intervention.why_this_surfaced}</p>
          </section>

          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">What changed</h4>
            <p className="text-sm text-gray-700 leading-relaxed" data-testid="peek-what-changed">{intervention.what_changed}</p>
          </section>

          <section className={`p-3.5 rounded-lg ${meta.bg} border ${meta.border}`}>
            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recommended action</h4>
            <p className={`text-sm font-medium ${meta.color}`} data-testid="peek-recommended-action">{intervention.recommended_action}</p>
            <p className="text-xs text-gray-500 mt-1">Owner: <span className="font-medium text-gray-700">{intervention.owner}</span></p>
          </section>

          {(details.affected_schools || details.event_name || details.school_name || details.deadline_dates) && (
            <section>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Relevant context</h4>
              <div className="space-y-2">
                {details.event_name && (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{details.event_name} — {details.expected_schools} schools expected</span>
                  </div>
                )}
                {details.school_name && (
                  <div className="flex items-start gap-2 text-sm">
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{details.school_name} — {details.response_type?.replace(/_/g, " ")}</span>
                  </div>
                )}
                {details.affected_schools && (
                  <div className="flex items-start gap-2 text-sm">
                    <Target className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{details.affected_schools.join(", ")}</span>
                  </div>
                )}
                {details.deadline_dates && (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">Deadlines: {details.deadline_dates.join(", ")}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {details.suggested_steps && details.suggested_steps.length > 0 && (
            <section>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Next steps</h4>
              <ol className="space-y-2">
                {details.suggested_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-400 pt-2 border-t border-gray-100">
            <span>Score: {intervention.score}</span>
            <span>·</span>
            <span>Urgency: {intervention.urgency}/10</span>
            <span>·</span>
            <span>Impact: {intervention.impact}/10</span>
          </div>
        </div>

        {/* Footer — action forms or buttons */}
        <div className="border-t border-gray-100 px-5 py-4">
          {activeAction === "note" && (
            <NoteForm athleteId={intervention.athlete_id} onDone={handleActionDone} onCancel={() => setActiveAction(null)} />
          )}
          {activeAction === "assign" && (
            <AssignForm
              athleteId={intervention.athlete_id}
              currentOwner={intervention.owner}
              category={intervention.category}
              onDone={handleActionDone}
              onCancel={() => setActiveAction(null)}
            />
          )}
          {activeAction === "message" && (
            <MessageForm athleteId={intervention.athlete_id} onDone={handleActionDone} onCancel={() => setActiveAction(null)} />
          )}
          {!activeAction && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  className="flex-1 text-xs rounded-full gap-1.5"
                  onClick={() => setActiveAction("note")}
                  data-testid="peek-action-log-note"
                >
                  <FileText className="w-3.5 h-3.5" /> Log Note
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="flex-1 text-xs rounded-full gap-1.5"
                  onClick={() => setActiveAction("message")}
                  data-testid="peek-action-message"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="flex-1 text-xs rounded-full gap-1.5"
                  onClick={() => setActiveAction("assign")}
                  data-testid="peek-action-assign"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Assign
                </Button>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full font-medium gap-2"
                data-testid="peek-open-pod-btn"
                onClick={() => {
                  onClose();
                  navigate(`/support-pods/${intervention.athlete_id}?context=${intervention.category}`);
                }}
              >
                Open Support Pod
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default PeekPanel;
