import { useState, useRef } from "react";
import { GripVertical, MapPin, Clock, Route, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RouteSegment {
  order: number;
  address: string;
  distance: number;
  duration: number;
  cumulativeDistance: number;
  cumulativeDuration: number;
}

interface DraggableStopListProps {
  segments: RouteSegment[];
  onReorder: (newSegments: RouteSegment[]) => void;
  onReset: () => void;
  isModified: boolean;
}

const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const DraggableStopList = ({ 
  segments, 
  onReorder, 
  onReset,
  isModified 
}: DraggableStopListProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Don't allow dragging first or last item
    if (index === 0 || index === segments.length - 1) {
      e.preventDefault();
      return;
    }
    
    setDraggedIndex(index);
    dragNode.current = e.target as HTMLDivElement;
    
    // Make drag image semi-transparent
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
    
    // Delay to allow drag image to be captured
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.style.opacity = "0.5";
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Don't allow dropping on first or last position
    if (index === 0 || index === segments.length - 1) return;
    if (draggedIndex === null || draggedIndex === index) return;
    
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    if (dropIndex === 0 || dropIndex === segments.length - 1) return;
    
    const newSegments = [...segments];
    const [draggedItem] = newSegments.splice(draggedIndex, 1);
    newSegments.splice(dropIndex, 0, draggedItem);
    
    // Recalculate order numbers (keep first and last fixed)
    const reorderedSegments = newSegments.map((seg, idx) => ({
      ...seg,
      order: idx + 1,
      // Note: distances will need recalculation via API - for now just update order
    }));
    
    onReorder(reorderedSegments);
    toast.success("Ordning uppdaterad! Avstånden behöver räknas om.");
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {/* Header with reset button */}
      {isModified && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-warning/10 border border-warning/30 mb-4 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-warning">
            <RotateCcw className="h-4 w-4" />
            <span>Ordningen har ändrats manuellt</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 text-warning hover:text-warning hover:bg-warning/20"
          >
            Återställ
          </Button>
        </div>
      )}

      {/* Instruction */}
      <p className="text-xs text-muted-foreground px-2 mb-3">
        💡 Dra mellanliggande stopp för att ändra ordning
      </p>

      {/* Draggable list */}
      <div className="space-y-1">
        {segments.map((segment, index) => {
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;
          const isDraggable = !isFirst && !isLast;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={`${segment.order}-${segment.address}`}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200",
                isDraggable && "cursor-grab active:cursor-grabbing",
                !isDraggable && "cursor-default",
                isDragging && "opacity-50 scale-95",
                isDragOver && "border-primary bg-primary/5 scale-[1.02]",
                !isDragging && !isDragOver && "border-border/50 hover:border-border",
                isFirst && "bg-accent/5 border-accent/30",
                isLast && "bg-destructive/5 border-destructive/30"
              )}
            >
              {/* Drag Handle */}
              <div className={cn(
                "flex-shrink-0 transition-opacity",
                isDraggable ? "opacity-40 hover:opacity-100" : "opacity-0"
              )}>
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Number Badge */}
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all",
                isFirst && "bg-accent text-white",
                isLast && "bg-destructive text-white",
                !isFirst && !isLast && "bg-primary/10 text-primary"
              )}>
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{segment.address}</span>
                  {isFirst && (
                    <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium flex-shrink-0">
                      Start
                    </span>
                  )}
                  {isLast && (
                    <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-medium flex-shrink-0">
                      Mål
                    </span>
                  )}
                </div>
                {index > 0 && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Route className="h-3 w-3" />
                      {formatDistance(segment.distance)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(segment.duration)}
                    </span>
                  </div>
                )}
              </div>

              {/* Lock indicator for first/last */}
              {!isDraggable && (
                <div className="flex-shrink-0 text-muted-foreground/50">
                  <MapPin className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

