/** Placeholder rows while fuel / EV lists load from the network. */

export default function StationListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-1" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex gap-2 items-stretch animate-pulse"
        >
          <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.04] h-[4.75rem]" />
          <div className="shrink-0 w-[3.25rem] rounded-2xl bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}
