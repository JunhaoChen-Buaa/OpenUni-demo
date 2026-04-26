"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";

const FAB_MARGIN = 18;
const FAB_TOP_MARGIN = 18;
const NAV_RESERVED_HEIGHT = 120;
const FAB_NAV_GAP = 18;
const DRAG_THRESHOLD = 6;
const STORAGE_KEY = "openuni-ask-bubble-y";

type Position = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
} | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredY() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function writeStoredY(y: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, String(Math.round(y)));
}

export function FloatingAskButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const suppressClickRef = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);

  const measureBounds = () => {
    const element = linkRef.current;
    const parent = element?.parentElement;

    if (!element || !parent) {
      return null;
    }

    const parentRect = parent.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const minX = FAB_MARGIN;
    const maxX = Math.max(FAB_MARGIN, parentRect.width - elementRect.width - FAB_MARGIN);
    const minY = FAB_TOP_MARGIN;
    const maxY = Math.max(
      FAB_TOP_MARGIN,
      parentRect.height - NAV_RESERVED_HEIGHT - FAB_NAV_GAP - elementRect.height,
    );

    return {
      minX,
      maxX,
      minY,
      maxY,
    };
  };

  const snapToRight = (nextY?: number) => {
    const bounds = measureBounds();
    if (!bounds) {
      return;
    }

    const defaultY = clamp(bounds.maxY - 44, bounds.minY, bounds.maxY);
    const y = clamp(nextY ?? position?.y ?? defaultY, bounds.minY, bounds.maxY);
    setPosition({
      x: bounds.maxX,
      y,
    });
    writeStoredY(y);
  };

  useEffect(() => {
    const updatePosition = () => {
      const bounds = measureBounds();
      if (!bounds) {
        return;
      }

      const storedY = readStoredY();
      const defaultY = clamp(bounds.maxY - 44, bounds.minY, bounds.maxY);
      const currentY = position?.y ?? storedY ?? defaultY;
      setPosition({
        x: bounds.maxX,
        y: clamp(currentY, bounds.minY, bounds.maxY),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  useEffect(() => {
    if (!position) {
      return;
    }

    writeStoredY(position.y);
  }, [position]);

  const handlePointerDown = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (!position || !linkRef.current) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };

    setDragging(true);
    linkRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const bounds = measureBounds();
    if (!bounds) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      dragState.moved = true;
    }

    setPosition({
      x: clamp(dragState.originX + deltaX, bounds.minX, bounds.maxX),
      y: clamp(dragState.originY + deltaY, bounds.minY, bounds.maxY),
    });
  };

  const finishDrag = (pointerId: number) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== pointerId) {
      return;
    }

    if (linkRef.current?.hasPointerCapture(pointerId)) {
      linkRef.current.releasePointerCapture(pointerId);
    }

    const finalY = position?.y;
    snapToRight(finalY);
    setDragging(false);

    if (dragState.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 80);
    }

    dragRef.current = null;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLAnchorElement>) => {
    finishDrag(event.pointerId);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLAnchorElement>) => {
    finishDrag(event.pointerId);
  };

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Link
      ref={linkRef}
      href={href}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={
        position
          ? {
              left: position.x,
              top: position.y,
            }
          : {
              opacity: 0,
            }
      }
      className={[
        "pointer-events-auto absolute z-30 inline-flex h-[var(--openuni-fab-height)] min-w-[168px] max-w-[calc(100%-2rem)] touch-none items-center gap-2 rounded-full border border-white/26 bg-gradient-to-r from-[#17356f] via-[#1f4a96] to-[#2b67d3] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_20px_38px_rgba(23,53,111,0.34)] ring-1 ring-white/14 backdrop-blur-xl",
        dragging
          ? "cursor-grabbing transition-none"
          : "cursor-grab transition-[left,top,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_42px_rgba(23,53,111,0.4)]",
        className,
      ].join(" ")}
      aria-label="问一问 OpenUni"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-[0_10px_20px_rgba(255,255,255,0.24)]">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path
            d="M8 10.5H16M8 14H12M20 11.5C20 16.1944 16.1944 20 11.5 20C9.90811 20 8.41846 19.5632 7.14394 18.8026L3.5 20L4.69744 16.3561C3.93684 15.0815 3.5 13.5919 3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 12.1686 20.4951 12.336 20.4855 12.5022"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}
