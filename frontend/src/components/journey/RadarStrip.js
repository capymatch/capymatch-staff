export function RadarStrip({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border px-4 py-3"
      style={{ backgroundColor: "#fff", borderColor: "rgba(20,37,68,0.06)", boxShadow: "0 1px 4px rgba(19,33,58,0.03)" }}
      data-testid="radar-strip">
      <p className="text-[9px] font-bold uppercase tracking-[1px] mb-2"
        style={{ color: "#94a3b8" }}>Also on your radar</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {items.slice(0, 5).map(item => (
          <div key={item.id} className="flex items-center gap-2 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
            <span className="text-[10.5px] font-medium truncate max-w-[200px]"
              style={{ color: "#0f172a" }}>{item.title}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: "rgba(100,116,139,0.06)", color: "#94a3b8" }}>
              {item.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
