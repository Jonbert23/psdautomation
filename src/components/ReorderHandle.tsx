import { useRef, useState, type DragEvent } from "react";
import { GripVertical } from "lucide-react";
import { reorderItem } from "../lib/profileFactories";

export function useRowReorder<T>(items: T[], commit: (next: T[]) => void) {
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleProps(index: number) {
    return {
      draggable: true,
      onDragStart: (event: DragEvent<HTMLButtonElement>) => {
        dragIndex.current = index;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      },
      onDragEnd: () => {
        dragIndex.current = null;
        setOverIndex(null);
      },
    };
  }

  function rowProps(index: number) {
    return {
      className: overIndex === index ? "reorder-target" : undefined,
      onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (overIndex !== index) setOverIndex(index);
      },
      onDrop: (event: DragEvent<HTMLTableRowElement>) => {
        event.preventDefault();
        const from = dragIndex.current;
        dragIndex.current = null;
        setOverIndex(null);
        if (from === null || from === index) return;
        commit(reorderItem(items, from, index));
      },
    };
  }

  return { handleProps, rowProps };
}

export function ReorderHandle({
  label,
  ...props
}: {
  label: string;
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <button type="button" className="btn drag-handle" aria-label={label} {...props}>
      <GripVertical size={16} strokeWidth={1.75} />
    </button>
  );
}
