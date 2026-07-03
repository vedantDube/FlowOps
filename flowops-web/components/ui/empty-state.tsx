import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import FlowLine from "@/app/components/FlowLine";
import { cn } from "@/app/lib/utils";

interface EmptyStateCta {
  label: string;
  onClick?: () => void;
  href?: string;
  shimmer?: boolean;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  cta?: EmptyStateCta;
  className?: string;
}

// Codifies the icon-box + title + description + optional-CTA pattern already
// hand-rolled on dashboard/ai-review — a rounded-2xl icon box (not rounded-card,
// disproportionate at this size), bold title, muted description.
export function EmptyState({ icon: Icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
        <Icon className="text-muted-foreground" size={24} />
      </div>
      <FlowLine width={44} height={9} strokeWidth={2} className="mb-3 opacity-70" />
      <p className="font-semibold text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {cta && cta.shimmer ? (
        cta.href ? (
          <Link href={cta.href} className="mt-5">
            <ShimmerButton>{cta.label}</ShimmerButton>
          </Link>
        ) : (
          <ShimmerButton className="mt-5" onClick={cta.onClick}>
            {cta.label}
          </ShimmerButton>
        )
      ) : (
        cta && (
          <Button
            className="mt-5"
            onClick={cta.onClick}
            {...(cta.href ? { asChild: true } : {})}
          >
            {cta.href ? <Link href={cta.href}>{cta.label}</Link> : cta.label}
          </Button>
        )
      )}
    </div>
  );
}
