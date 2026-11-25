export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard data">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-slate-100 rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-7 w-36 bg-slate-200/70 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200/70 rounded" />
          <div className="h-44 w-full bg-slate-100 rounded-lg" />
        </div>
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="h-5 w-40 bg-slate-200/70 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
