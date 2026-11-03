export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-80 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}