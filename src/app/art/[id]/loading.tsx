import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="bg-void min-h-screen relative">
      <div className="w-full h-[68vh] md:h-[90vh] relative z-0 flex items-center justify-center bg-background/5">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
      <div className="relative z-10 px-8 md:px-16 py-10 space-y-8">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="max-w-[800px] space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </main>
  );
}
