"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppConfig } from '@/types/signage';
import AuxRenderer from './AuxRenderer';
export default function ScaledAuxZone({ node }: { node: NonNullable<AppConfig['auxLayout']> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const recalc = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const ch = container.clientHeight;
    // scrollHeight = natural height unaffected by CSS transform — stable, no loop
    const nh = content.scrollHeight;
    if (!ch || !nh) return;
    const s = Math.min(ch / nh, 1); // never upscale; width already fits 100%
    setScale(prev => (Math.abs(prev - s) > 0.0005 ? s : prev));
  }, []);

  // Re-measure whenever container resizes OR node layout changes
  useEffect(() => {
    recalc();
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(recalc);
      if (containerRef.current) ro.observe(containerRef.current); // container only
      return () => ro.disconnect();
    }
  }, [recalc, node]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden flex items-center justify-center">
      <div
        ref={contentRef}
        style={{
          transformOrigin: 'center',
          transform: "scale(" + scale + ")",
          width: '100%',
        }}
      >
        <AuxRenderer node={node} />
      </div>
    </div>
  );
}
