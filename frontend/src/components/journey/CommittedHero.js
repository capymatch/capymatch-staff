export function CommittedHero({ program }) {
  return (
    <div className="rounded-lg border relative overflow-hidden"
      style={{
        borderColor: "rgba(251,191,36,0.3)",
        background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(16,185,129,0.06) 40%, #0f172a 100%)",
      }}
      data-testid="committed-hero">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-12px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { left: "8%", delay: "0s", dur: "3s", color: "#fbbf24", size: 6 },
          { left: "18%", delay: "0.4s", dur: "3.5s", color: "#1a8a80", size: 5 },
          { left: "30%", delay: "0.8s", dur: "2.8s", color: "#22c55e", size: 7 },
          { left: "45%", delay: "0.2s", dur: "3.2s", color: "#fbbf24", size: 5 },
          { left: "58%", delay: "1s", dur: "3s", color: "#1a8a80", size: 6 },
          { left: "70%", delay: "0.6s", dur: "3.4s", color: "#22c55e", size: 4 },
          { left: "82%", delay: "0.3s", dur: "2.9s", color: "#fbbf24", size: 7 },
          { left: "92%", delay: "0.9s", dur: "3.1s", color: "#1a8a80", size: 5 },
        ].map((p, i) => (
          <div key={i} style={{
            position: "absolute", top: 0, left: p.left,
            width: p.size, height: p.size, borderRadius: i % 2 === 0 ? "50%" : "1px",
            backgroundColor: p.color,
            animation: `confettiFall ${p.dur} ${p.delay} ease-in infinite`,
          }} />
        ))}
      </div>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)" }} />
      <div className="relative p-6 sm:p-8 text-center">
        <div className="text-5xl mb-4">&#127942;</div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
          style={{
            background: "linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
          }}>
          Committed
        </p>
        <h2 className="text-xl sm:text-2xl font-extrabold mb-2 text-white">
          {program.university_name}
        </h2>
        <p className="text-sm mb-1 text-slate-300">
          The hard work paid off. Congratulations!
        </p>
        <p className="text-xs text-slate-400">
          This is a moment to celebrate with your family.
        </p>
        <div className="mx-auto mt-5 h-px w-24"
          style={{ background: "linear-gradient(90deg, transparent, #fbbf24, transparent)" }} />
      </div>
    </div>
  );
}
