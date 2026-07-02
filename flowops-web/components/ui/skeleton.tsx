import { cn } from "@/app/lib/utils";

const VARIANT_CLASSES = {
  rect: "rounded-lg",
  circle: "rounded-full",
  text: "rounded h-4",
} as const;

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof VARIANT_CLASSES;
}

// Neutral-gray shimmer sweep (built from --muted, not --primary) so loading
// states look the same regardless of the active [data-accent] theme — see
// the skeletonShimmer keyframe in globals.css.
function Skeleton({ className, variant = "rect", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-[length:200%_100%] [background-image:linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--muted-foreground)/0.15)_50%,hsl(var(--muted))_100%)] [animation:skeletonShimmer_1.6s_ease-in-out_infinite]",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
