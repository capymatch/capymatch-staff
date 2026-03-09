import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mail, Loader2, CheckCircle2, Search, School, AlertTriangle, ChevronRight, ArrowRight } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "./ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PHASES = {
  consent: { step: 0, label: "Getting Started" },
  scanning: { step: 1, label: "Scanning Inbox" },
  preview: { step: 2, label: "Review Schools" },
  done: { step: 3, label: "Import Complete" },
};

function StageTag({ stage }) {
  const colors = {
    in_conversation: { bg: "bg-green-500/10", text: "text-green-400", label: "In Conversation" },
    outreach: { bg: "bg-teal-500/10", text: "text-teal-400", label: "Outreach Sent" },
    added: { bg: "bg-slate-500/10", text: "text-slate-400", label: "Added" },
  };
  const c = colors[stage] || colors.added;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${c.bg} ${c.text}`}>{c.label}</span>;
}

function SchoolCard({ suggestion, selected, onToggle }) {
  const s = suggestion;
  const schoolName = s.school_id || s.normalized_domain || "Unknown";
  const confidence = s.confidence || 0;
  const disabled = s.already_on_board || s.ignored;

  return (
    <button
      onClick={() => !disabled && onToggle(schoolName)}
      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
        disabled ? "opacity-40 cursor-not-allowed border-slate-700/30"
        : selected ? "border-teal-600/50 bg-teal-700/10"
        : "border-slate-700/50 hover:border-slate-600 bg-slate-800/20"
      }`}
      disabled={disabled}
      data-testid={`import-school-${schoolName.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
          disabled ? "border-slate-600" : selected ? "border-teal-600 bg-teal-600" : "border-slate-600"
        }`}>
          {selected && !disabled && <CheckCircle2 className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{schoolName}</p>
            {s.proposed_stage && <StageTag stage={s.proposed_stage} />}
            {s.already_on_board && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400">Already Added</span>
            )}
            {s.attention_required && !disabled && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400">Needs Reply</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-1">
            <span>{s.outbound_count || 0} sent</span>
            <span>{s.inbound_count || 0} received</span>
            <span>{s.thread_count || 0} threads</span>
            {confidence >= 80 && <span className="text-teal-500">High match</span>}
          </div>
          {s.sample_subjects?.length > 0 && (
            <p className="text-[10px] text-slate-500 truncate">"{s.sample_subjects[0]}"</p>
          )}
          {s.discovered_emails?.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Mail className="w-2.5 h-2.5 text-slate-500" />
              <span className="text-[10px] text-slate-500 truncate">{s.discovered_emails.slice(0, 2).join(", ")}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function GmailImportModal({ onClose }) {
  const [phase, setPhase] = useState("consent");
  const [runId, setRunId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [messagesScanned, setMessagesScanned] = useState(0);
  const [schoolsFound, setSchoolsFound] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const startScan = async () => {
    setPhase("scanning");
    setScanning(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/athlete/gmail/import-history`);
      const rid = res.data.run_id;
      setRunId(rid);
      if (res.data.resumed) {
        await pollStatus(rid);
      } else {
        startPolling(rid);
      }
    } catch (e) {
      const detail = e.response?.data?.detail || "Failed to start import";
      if (e.response?.status === 409) {
        const existingRunId = e.response?.headers?.["x-run-id"];
        if (existingRunId) {
          setRunId(existingRunId);
          startPolling(existingRunId);
          return;
        }
      }
      setError(detail);
      setPhase("consent");
      setScanning(false);
    }
  };

  const startPolling = useCallback((rid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      await pollStatus(rid);
    }, 2000);
  }, []);

  const pollStatus = async (rid) => {
    try {
      const res = await axios.get(`${API}/athlete/gmail/import-history/${rid}/status`);
      const data = res.data;
      setMessagesScanned(data.messages_scanned || 0);
      setSchoolsFound(data.schools_found || 0);

      if (data.phase === "ready") {
        if (pollRef.current) clearInterval(pollRef.current);
        const sug = data.suggestions || [];
        setSuggestions(sug);
        const autoSelect = new Set();
        sug.forEach(s => {
          if (!s.ignored && !s.already_on_board && s.school_id) {
            autoSelect.add(s.school_id);
          }
        });
        setSelected(autoSelect);
        setPhase("preview");
        setScanning(false);
      } else if (data.phase === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setError(data.error?.message || "Import failed");
        setPhase("consent");
        setScanning(false);
      }
    } catch {
      // Polling error, continue
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const toggleSchool = (schoolId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set();
    suggestions.forEach(s => {
      if (!s.ignored && !s.already_on_board && s.school_id) all.add(s.school_id);
    });
    setSelected(all);
  };

  const deselectAll = () => setSelected(new Set());

  const confirmImport = async () => {
    if (selected.size === 0) { toast.error("Select at least one school"); return; }
    setConfirming(true);
    try {
      const selectedItems = suggestions
        .filter(s => selected.has(s.school_id))
        .map(s => ({ school_id: s.school_id, domain: s.normalized_domain }));
      const res = await axios.post(`${API}/athlete/gmail/import-history/${runId}/confirm`, { selected: selectedItems });
      setImportResult(res.data);
      setPhase("done");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Import failed");
    } finally { setConfirming(false); }
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (s.school_id || "").toLowerCase().includes(q) ||
           (s.normalized_domain || "").toLowerCase().includes(q);
  });

  const selectableCount = suggestions.filter(s => !s.ignored && !s.already_on_board && s.school_id).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="gmail-import-overlay">
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", maxHeight: "85vh" }}
        data-testid="gmail-import-modal">

        {/* Header */}
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-600" />Import from Gmail
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="import-close-btn">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {Object.entries(PHASES).map(([key, val], idx) => {
              const current = PHASES[phase]?.step || 0;
              const isActive = idx === current;
              const isPast = idx < current;
              return (
                <div key={key} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isActive ? "bg-teal-700 text-white" : isPast ? "bg-teal-700/30 text-teal-400" : "bg-slate-700/50 text-slate-500"
                  }`}>{idx + 1}</div>
                  <span className={`text-[10px] font-medium hidden sm:block ${
                    isActive ? "text-white" : isPast ? "text-teal-600" : "text-slate-500"
                  }`}>{val.label}</span>
                  {idx < 3 && <div className={`flex-1 h-px ${isPast ? "bg-teal-700/50" : "bg-slate-700/50"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Phase: Consent */}
          {phase === "consent" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-teal-700/15 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Scan Your Inbox</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
                We'll scan your email headers from the last 6 months to find schools you've been
                communicating with. Only subject lines and sender addresses are read — never email content.
              </p>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-600/10 border border-red-500/30 mb-4 max-w-sm mx-auto">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-[11px] text-red-300">{error}</p>
                </div>
              )}
              <Button onClick={startScan} disabled={scanning}
                className="bg-teal-700 hover:bg-teal-800 text-white text-sm h-10 px-6" data-testid="start-scan-btn">
                {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Start Scanning
              </Button>
            </div>
          )}

          {/* Phase: Scanning */}
          {phase === "scanning" && (
            <div className="text-center py-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-teal-700/30 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-teal-700/15 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Scanning your inbox...</h3>
              <p className="text-xs text-slate-400 mb-4">This may take a minute. Don't close this window.</p>
              <div className="flex items-center justify-center gap-6">
                <div>
                  <p className="text-2xl font-extrabold text-white" data-testid="scan-messages-count">{messagesScanned}</p>
                  <p className="text-[10px] text-slate-400">Emails Scanned</p>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div>
                  <p className="text-2xl font-extrabold text-teal-500" data-testid="scan-schools-count">{schoolsFound}</p>
                  <p className="text-[10px] text-slate-400">Schools Found</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Preview */}
          {phase === "preview" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectableCount} schools found
                  </h3>
                  <p className="text-[10px] text-slate-400">Select which schools to add to your pipeline</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="text-[10px] font-semibold text-teal-600 hover:text-teal-500" data-testid="select-all-btn">Select All</button>
                  <span className="text-slate-600">|</span>
                  <button onClick={deselectAll} className="text-[10px] font-semibold text-slate-400 hover:text-slate-300" data-testid="deselect-all-btn">Deselect All</button>
                </div>
              </div>

              {suggestions.length > 8 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search schools..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-teal-600 bg-slate-800/50 border-slate-700 text-white"
                    data-testid="import-search-input" />
                </div>
              )}

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1" data-testid="import-school-list">
                {filteredSuggestions.map((s, idx) => (
                  <SchoolCard
                    key={s.school_id || s.normalized_domain || idx}
                    suggestion={s}
                    selected={selected.has(s.school_id)}
                    onToggle={toggleSchool}
                  />
                ))}
                {filteredSuggestions.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-8">No schools match your search</p>
                )}
              </div>
            </div>
          )}

          {/* Phase: Done */}
          {phase === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-teal-700/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Import Complete!</h3>
              <p className="text-xs text-slate-400 mb-4">
                {importResult?.created_count || 0} schools added to your pipeline
                {importResult?.skipped_count > 0 && `, ${importResult.skipped_count} skipped (already added or unmapped)`}
              </p>
              <Button onClick={onClose}
                className="bg-teal-700 hover:bg-teal-800 text-white text-sm h-10 px-6" data-testid="import-done-btn">
                <ArrowRight className="w-4 h-4 mr-2" />Go to Pipeline
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === "preview" && (
          <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px] text-slate-400">
              <span className="font-semibold text-teal-500">{selected.size}</span> of {selectableCount} selected
            </p>
            <Button onClick={confirmImport} disabled={confirming || selected.size === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
              style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}
              data-testid="confirm-import-btn">
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <School className="w-4 h-4" />}
              Add {selected.size} Schools to Pipeline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
