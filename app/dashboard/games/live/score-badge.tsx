export function ScoreBadge({ score, desc }: { score: number; desc: string }) {
  const isTriple = desc.toUpperCase().includes("T") || desc.toUpperCase().includes("TRIPLE");
  const isDouble = desc.toUpperCase().includes("D") || desc.toUpperCase().includes("DOUBLE");
  const isBull = score === 25 || score === 50;

  let cls = "bg-slate-700 text-white";
  if (isBull) cls = "bg-amber-500 text-black";
  else if (isTriple) cls = "bg-red-600 text-white";
  else if (isDouble) cls = "bg-emerald-600 text-white";

  return (
    <div className={`flex flex-col items-center justify-center rounded-lg px-4 py-3 min-w-[72px] ${cls}`}>
      <span className="text-2xl font-black">{score}</span>
      <span className="text-xs font-mono mt-0.5 opacity-80">{desc}</span>
    </div>
  );
}
