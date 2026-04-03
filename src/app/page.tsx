"use client";
// Cache invalidation re-compile trigger

import { useState, useEffect } from "react";
import useSWR from "swr";
import { MovieGroup, AppConfig, Showing } from "@/types/signage";
// Import dynamically so mapped icon strings work
import * as LucideIcons from "lucide-react";
import Image from "next/image";
import MovieCard from "@/components/signage/MovieCard";

export default function Home() {
  const [movieGroups, setMovieGroups] = useState<MovieGroup[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeStr, setTimeStr] = useState("00:00 AM");

  const updateClock = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
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
          today = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
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
      // Fetch both configurations and showings together
      const [cfgRes, apiRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/showings")
      ]);
      
      const cfg: AppConfig = await cfgRes.json();
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
        const sessionCustomBadges = cfg.sessionBadges && cfg.sessionBadges[s.Id] ? cfg.sessionBadges[s.Id] : [];
        s.ShowingBadges = [...(s.ShowingBadges || []), ...sessionCustomBadges];

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
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    fetchData();
    const showingInterval = setInterval(fetchData, 5 * 60 * 1000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(showingInterval);
    };
  }, []);

  // Helper func to split movies into rows smartly based on display scaling needs
  const chunkMovies = (groups: MovieGroup[]) => {
    if (groups.length <= 3) return [groups];
    // For 4 to 8 movies, splitting evenly into two rows prevents horizontal crowding
    const mid = Math.ceil(groups.length / 2);
    return [groups.slice(0, mid), groups.slice(mid)];
  };

  return (
    <main className="fixed inset-0 w-full h-full flex flex-col p-4 md:p-6 lg:p-8 overflow-hidden bg-[#0a0a0a]">
      {/* Header matching the screenshot: small logo left, time right */}
      <header className="flex justify-between items-center mb-3 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://indy-systems.imgix.net/acawvcj8kswipsw2to0golg6x4ay?undefined"
          alt="Tasveer Logo"
          className="h-8 md:h-10 w-auto object-contain"
        />
        <div className="text-xl md:text-2xl font-medium text-white tracking-wide">
          {timeStr}
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-4 md:gap-8 overflow-hidden items-center w-full h-full pb-2">
        {loading ? (
          <div className="w-full h-[50vh] flex flex-col items-center justify-center text-brand-accent animate-pulse">
             <div className="w-12 h-12 border-4 border-card-border border-t-brand-accent rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-semibold">Loading Schedule...</h2>
          </div>
        ) : movieGroups.length === 0 ? (
          <div className="w-full h-[50vh] flex flex-col items-center justify-center text-brand-accent">
            <h2 className="text-2xl font-semibold">No showings found for schedule</h2>
          </div>
        ) : (
          chunkMovies(movieGroups).map((row, rowIndex, rowArray) => (
            <div key={rowIndex} className="flex flex-1 flex-row justify-center gap-4 md:gap-8 w-full min-h-0 items-start">
              {row.map((group) => (
                <MovieCard key={group.FilmId} group={group} rowArrayLength={rowArray.length} config={config} />
              ))}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
