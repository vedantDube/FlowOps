"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MetricWidget from "./MetricWidget";
import ChartWidget from "./ChartWidget";
import ListWidget from "./ListWidget";

const CONTENT_BY_TYPE = {
  metric: MetricWidget,
  chart: ChartWidget,
  list: ListWidget,
};

export default function WidgetRenderer({ widget, orgId, days, onRemove, onToggleSpan }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Content = CONTENT_BY_TYPE[widget.type];
  if (!Content) return null;

  // MetricWidget renders MetricCard, which already provides its own Card
  // shell — wrapping it in another Card here would double the border/shadow.
  const Wrapper = widget.type === "metric" ? "div" : Card;
  const wrapperProps = widget.type === "metric" ? {} : { className: "overflow-hidden h-full" };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${widget.span === 2 ? "col-span-1 sm:col-span-2" : "col-span-1"}`}
    >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 rounded-lg p-0.5 border border-border/60">
        <button
          {...attributes}
          {...listeners}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => onToggleSpan(widget.id)}
          aria-label="Toggle widget size"
        >
          {widget.span === 2 ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(widget.id)}
          aria-label="Remove widget"
        >
          <X size={14} />
        </Button>
      </div>
      <Wrapper {...wrapperProps}>
        <Content widget={widget} orgId={orgId} days={days} />
      </Wrapper>
    </div>
  );
}
