import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Database, HardDrive, AlertTriangle, Server, Layers } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function AdminStatus() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/admin/status`)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Failed to load status</p>
      </div>
    );
  }

  const { collections, limitations } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200" data-testid="admin-status-page">
      <header className="border-b border-gray-800/60">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/mission-control")} className="text-gray-500 hover:text-gray-300 transition-colors" data-testid="admin-back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <h1 className="font-semibold text-sm text-gray-100">System Status</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-800 rounded text-gray-400">INTERNAL</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Layers className="w-3.5 h-3.5" />
            <span>{data.persistence_phase}</span>
            <span className="text-gray-700">|</span>
            <span className="font-mono">{data.architecture?.split(".")[0]}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-6 py-8 space-y-8">
        {/* Persisted Collections */}
        <section data-testid="persisted-collections">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Persisted (MongoDB)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {collections.persisted.map((c) => (
              <div key={c.name} className="bg-gray-900 border border-gray-800/60 rounded-lg p-4" data-testid={`collection-${c.name}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-sm text-gray-100">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded">P{c.phase}</span>
                    <span className="text-lg font-bold text-gray-100">{c.count}</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* In-Memory Only */}
        <section data-testid="memory-only-collections">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <h2 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">In-Memory Only (Resets on Restart)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {collections.in_memory_only.map((c) => (
              <div key={c.name} className="bg-gray-900 border border-gray-800/60 rounded-lg p-4 border-l-2 border-l-amber-800" data-testid={`memory-${c.name}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-sm text-gray-100">{c.name}</span>
                  <span className="text-lg font-bold text-gray-300">{c.count}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{c.description}</p>
                <p className="text-[10px] text-gray-600 mt-1 font-mono">source: {c.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Seed Strategy */}
        <section className="bg-gray-900 border border-gray-800/60 rounded-lg p-5" data-testid="seed-strategy">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Seed Strategy</h2>
          <p className="text-sm text-gray-300">{data.seed_strategy}</p>
        </section>

        {/* Limitations */}
        <section data-testid="limitations">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-gray-500" />
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Known Limitations</h2>
          </div>
          <div className="space-y-2">
            {limitations.map((l, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                <span className="text-gray-600 mt-0.5 shrink-0">-</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminStatus;
