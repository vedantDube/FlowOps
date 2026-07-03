import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Contributors */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="circle" className="h-8 w-8" />
                <Skeleton variant="text" className="w-32" />
                <Skeleton variant="text" className="w-16 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
