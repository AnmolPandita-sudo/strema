export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(229,9,20,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.06),transparent_30%)]" />

        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.9)]" />

            <span className="text-sm font-bold uppercase tracking-[0.35em] text-white/90">
              STREMA
            </span>
          </div>

          <div className="relative">
            <div className="h-20 w-20 animate-spin rounded-full border border-white/10 border-t-red-500" />

            <div className="absolute inset-3 rounded-full border border-red-500/20 bg-white/[0.03] backdrop-blur-xl" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight md:text-4xl">
              Loading your next scene
            </h1>

            <p className="text-sm text-gray-400 md:text-base">
              Please wait while the page gets ready.
            </p>
          </div>

          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
            <div className="loading-bar h-full w-1/2 rounded-full bg-red-500" />
          </div>
        </div>
      </div>
    </main>
  );
}