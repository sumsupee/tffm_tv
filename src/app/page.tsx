"use client";
// Cache invalidation re-compile trigger

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { MovieGroup, AppConfig, Showing, DEFAULT_CONFIG } from "@/types/signage";
import LZString from "lz-string";
// Import dynamically so mapped icon strings work
import * as LucideIcons from "lucide-react";
import Image from "next/image";
import MovieCard from "@/components/signage/MovieCard";
import AuxRenderer from "@/components/signage/AuxRenderer";

/**
 * Uniformly scales the entire interface to fit the screen while maintaining proportions.
 * This ensures the signage looks identical on a 4K TV, a 1080p monitor, or an old Raspberry Pi.
 */
function ScreenScaler({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const ww = containerRef.current.clientWidth;
    const wh = containerRef.current.clientHeight;
    
    if (ww === 0 || wh === 0) return;

    const refW = 1920;
    const refH = 1080;
    
    const s = Math.min(ww / refW, wh / refH);
    setScale(s);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    updateScale();
    
    const timeout = setTimeout(updateScale, 1000);

    if (typeof window !== 'undefined') {
      window.addEventListener("resize", updateScale);
      
      let ro: ResizeObserver | null = null;
      if ('ResizeObserver' in window && containerRef.current) {
        ro = new ResizeObserver(updateScale);
        ro.observe(containerRef.current);
      }
      
      return () => {
        clearTimeout(timeout);
        window.removeEventListener("resize", updateScale);
        if (ro) ro.disconnect();
      };
    }
  }, [updateScale]);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      <div
        style={{
          width: "1920px",
          height: "1080px",
          transform: "scale(" + scale + ")",
          transformOrigin: "center",
          flexShrink: 0,
          opacity: isMounted ? 1 : 0,
          transition: "opacity 0.3s ease-in-out"
        }}
        className="flex flex-col p-12"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Squish-to-fit: scales content down uniformly so everything is visible.
 *
 * Why this doesn't infinite-loop:
 *   CSS `transform` does NOT affect layout/scrollHeight — the browser reports
 *   the *natural* (pre-transform) size regardless of the current scale value.
 *   So setScale() → re-render → transform changes visually, scrollHeight stays
 *   the same → ResizeObserver on container doesn't fire → no loop.
 *
 *   We deliberately do NOT observe contentRef to avoid triggering on DOM mutations
 *   that happen as React renders children.
 */
function ScaledAuxZone({ node }: { node: NonNullable<AppConfig['auxLayout']> }) {
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


export default function Home() {
  const [movieGroups, setMovieGroups] = useState<MovieGroup[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeStr, setTimeStr] = useState("00:00 AM");
  const [debugError, setDebugError] = useState<string | null>(null);

  // Global error handler for debugging on legacy hardware
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleError = (msg: any, url: any, line: any, col: any, error: any) => {
        const err = "ERR: " + msg + " at " + line + ":" + col;
        setDebugError(err);
        return false;
      };
      window.onerror = handleError;
      return () => { window.onerror = null; };
    }
  }, []);

  const updateClock = () => {
    const now = new Date();
    let hours = now.getHours();
    const minsRaw = now.getMinutes();
    const minutes = minsRaw < 10 ? "0" + minsRaw : String(minsRaw);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    setTimeStr(`${hours}:${minutes} ${ampm}`);
  };

  const isToday = (dateString: string, override: string) => {
    const date = new Date(dateString);
    let today = new Date();
    
    if (override) {
       // Parse custom YYYY-MM-DD
       const parts = override.split('-');
       if(parts.length === 3) {
          today = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10)-1, parseInt(parts[2], 10));
       }
    }

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const fetchData = async () => {
    try {
      // 8-second timeout — prevents Pi from hanging indefinitely if the server-side API is slow.
      let controller: AbortController | null = null;
      let timeoutId: any = null;
      
      if (typeof window !== 'undefined' && 'AbortController' in window) {
        controller = new AbortController();
        timeoutId = setTimeout(function() { if (controller) controller.abort(); }, 8_000);
      }

      let apiRes: Response;
      try {
        apiRes = await fetch("/api/showings", { 
          signal: controller ? controller.signal : undefined,
          cache: 'no-store' 
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      if (!apiRes.ok) throw new Error(`API error: showings=${apiRes.status}`);
      
      let cfg: AppConfig = DEFAULT_CONFIG;
      if (typeof window !== "undefined" && window.location.hash.length > 1) {
        try {
          const raw = LZString.decompressFromBase64(window.location.hash.slice(1));
          cfg = raw ? JSON.parse(raw) : DEFAULT_CONFIG;
        } catch (e) {
          console.error("Failed to parse config from URL hash", e);
        }
      }

      const data = await apiRes.json();
      
      setConfig(cfg);
      const sessions = Array.isArray(data) ? data : data.sessions || [];

      // Optional override logic
      const targetDateOverride = cfg.dateOverride || "";

      // Only show matched date sessions
      const todaysSessions = sessions.filter((s: Showing) => {
        // If there's an override date, we only enforce the date string match, we don't care if the end time is past.
        // If it's literally today, restrict to future end times.
        if (targetDateOverride) {
            return isToday(s.FeatureStartTime, targetDateOverride);
        }
        return isToday(s.FeatureStartTime, "") && new Date(s.FeatureEndTime) > new Date();
      });

      // Group by Movie
      const groups = new Map<number, MovieGroup>();

      todaysSessions.forEach((s: Showing) => {
        // apply session custom badges
        const sessionCustomBadges = (cfg.sessionBadges && cfg.sessionBadges[s.Id]) ? cfg.sessionBadges[s.Id] : [];
        s.ShowingBadges = (s.ShowingBadges || []).concat(sessionCustomBadges);

        if (!groups.has(s.FilmId)) {
          // Clean the title by extracting trailing parenthesis info if present
          let baseTitle = s.Title;
          let extractedMeta = null;
          const parenIndex = baseTitle.indexOf(" (");
          if (parenIndex > -1) {
            const closingParen = baseTitle.indexOf(")", parenIndex);
            if (closingParen > -1) {
               extractedMeta = baseTitle.substring(parenIndex + 2, closingParen).replace(/,/g, " •");
            }
            baseTitle = baseTitle.substring(0, parenIndex);
          }

          const customTitle = cfg.movies && cfg.movies[s.FilmId] ? cfg.movies[s.FilmId].title : null;
          const customPoster = cfg.movies && cfg.movies[s.FilmId] ? cfg.movies[s.FilmId].posterUrl : null;

          groups.set(s.FilmId, {
            FilmId: s.FilmId,
            Title: customTitle && customTitle.trim().length > 0 ? customTitle : baseTitle,
            metaInfo: extractedMeta,
            Rating: s.Rating,
            posterUrl: customPoster && customPoster.trim().length > 0 ? customPoster : (s.ExtractedImgixUrl || `https://signage-us.indy.systems/showings-poster/${s.FilmId}`),
            showings: [],
          });
        }
        const group = groups.get(s.FilmId)!;
        group.showings.push(s);
      });

      // Sort showings within groups by start time
      groups.forEach((group) => {
        group.showings.sort(
          (a, b) =>
            new Date(a.FeatureStartTime).getTime() -
            new Date(b.FeatureStartTime).getTime()
        );
      });

      setMovieGroups(Array.from(groups.values()));
    } catch (error) {
      console.error("Failed to fetch data", error);
      // Failsafe: if the network completely drops on a kiosk, force a physical DOM reload after 15 seconds to try again
      setTimeout(() => {
        window.location.reload();
      }, 15000);
    } finally {
      // Guarantee the spinner drops even on failure
      setLoading(false);
    }
  };

  // Clock runs independently — a hanging API fetch can never block time updates.
  useEffect(() => {
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Data fetching — completely decoupled from the clock.
  useEffect(() => {
    fetchData();
    const showingInterval = setInterval(fetchData, 5 * 60 * 1000);

    // Hard loading failsafe: if the API doesn't respond in 10s (e.g. network issue on Pi)
    // drop the spinner so the UI isn't frozen on the logo screen.
    const loadingKillswitch = setTimeout(() => setLoading(false), 10_000);

    // Kiosk memory flush every 4 hours — helps low-RAM Pi stay stable overnight.
    const memoryFlushInterval = setInterval(() => window.location.reload(), 4 * 60 * 60 * 1000);

    return () => {
      clearInterval(showingInterval);
      clearInterval(memoryFlushInterval);
      clearTimeout(loadingKillswitch);
    };
  }, []);

  // Helper func to split movies into balanced rows (max 4 per row) dynamically
  const chunkMovies = (groups: MovieGroup[]) => {
    const maxPerRow = 6;
    if (groups.length <= maxPerRow) return [groups];
    
    const numRows = Math.ceil(groups.length / maxPerRow);
    const result = [];
    let currentIdx = 0;
    
    const baseCount = Math.floor(groups.length / numRows);
    const extraItems = groups.length % numRows;
    
    for (let i = 0; i < numRows; i++) {
        const rowCount = baseCount + (i < extraItems ? 1 : 0);
        result.push(groups.slice(currentIdx, currentIdx + rowCount));
        currentIdx += rowCount;
    }
    
    return result;
  };

  return (
    <ScreenScaler>
      {/* Debug Overlay — only shows on crash */}
      {debugError && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-900 text-white p-2 text-xs font-mono break-all opacity-80">
          {debugError}
        </div>
      )}

      {/* Header matching the screenshot: small logo left, time right */}
      <header 
        className="flex justify-between items-center mb-3 shrink-0"
        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://indy-systems.imgix.net/acawvcj8kswipsw2to0golg6x4ay?undefined"
          alt="Tasveer Logo"
          className="h-8 md:h-10 w-auto object-contain"
          style={{ height: '40px', width: 'auto', maxWidth: '200px' }}
        />
        <div 
          className="text-xl md:text-2xl font-medium text-white tracking-wide"
          style={{ color: 'white' }}
        >
          {timeStr}
        </div>
      </header>

      <div 
        className="flex flex-1 w-full h-full overflow-hidden"
        style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}
      >
        
        {/* Primary Interactive Module: Movies */}
        <div 
          className={"flex flex-col h-full shrink-0 transition-all duration-700 " + (((config && config.moviesColumnPercentage) || 100) < 100 ? 'pr-4 lg:pr-8' : '')}
          style={{ 
            width: ((config && config.moviesColumnPercentage) || 100) + "%",
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <section 
            className="flex flex-1 flex-col justify-center gap-4 md:gap-8 overflow-hidden items-center w-full h-full pb-2"
            style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', paddingBottom: '8px', overflow: 'hidden' }}
          >
        {loading ? (
          <div 
            className="w-full h-[50vh] flex flex-col items-center justify-center text-brand-accent animate-pulse"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#ff6600' }}
          >
             <div className="w-12 h-12 border-4 border-card-border border-t-brand-accent rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-semibold">Loading Schedule...</h2>
          </div>
        ) : movieGroups.length === 0 ? (
          <div 
            className="w-full h-[50vh] flex flex-col items-center justify-center text-brand-accent"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#ff6600' }}
          >
            <h2 className="text-2xl font-semibold">No showings found for schedule</h2>
          </div>
        ) : (
          chunkMovies(movieGroups).map((row, rowIndex, rowArray) => (
            <div 
              key={rowIndex} 
              className="flex flex-1 flex-row justify-center gap-4 md:gap-8 w-full min-h-0 items-start"
              style={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', width: '100%', minHeight: 0 }}
            >
              {row.map((group) => (
                <MovieCard key={group.FilmId} group={group} rowArrayLength={rowArray.length} config={config} />
              ))}
            </div>
          ))
        )}
          </section>
        </div>

        {/* Auxiliary Content Allocation Shell */}
        {((config && config.moviesColumnPercentage) || 100) < 100 && (
          <div 
            className="flex flex-col h-full shrink-0 transition-all duration-700 border-l border-white/5 bg-white/[0.02] relative"
            style={{ 
              width: (100 - ((config && config.moviesColumnPercentage) || 100)) + "%",
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              borderLeft: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {(config && config.auxLayout) ? (
              (function() {
                const auxLayout = config.auxLayout;
                const scale = config.auxScale || 'scroll';
                if (scale === 'fit') {
                  return <ScaledAuxZone node={auxLayout} />;
                }
                if (scale === 'fill') {
                  return (
                    <div className="w-full h-full flex flex-col overflow-hidden">
                      <AuxRenderer node={auxLayout} />
                    </div>
                  );
                }
                // scroll
                return (
                  <div className="w-full h-full overflow-auto">
                    <AuxRenderer node={auxLayout} />
                  </div>
                );
              })()
            ) : (
               <div className="flex flex-col items-center justify-center w-full h-full opacity-30 p-8 text-center text-balance overflow-auto">
                 <LucideIcons.LayoutGrid className="w-16 h-16 mb-4 text-brand-accent opacity-50" />
                 <h3 className="text-xl font-bold uppercase tracking-widest text-text-dim">Auxiliary Content Zone</h3>
                 <p className="mt-2 text-sm max-w-sm">Reserved layout partition for secondary promotional media or generalized signage assets.</p>
               </div>
            )}
          </div>
        )}
        
      </div>
    </ScreenScaler>
  );
}
