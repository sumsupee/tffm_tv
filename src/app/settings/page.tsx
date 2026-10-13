"use client";

import { useEffect, useState, useRef } from "react";
import * as LucideIcons from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { AppConfig, AuxNode } from "@/types/signage";
import AuxiliaryEditor from "@/components/settings/AuxiliaryEditor";
import LZString from "lz-string";
import { FESTIVAL_TIMEZONE, festivalDate, festivalTime } from "@/lib/signage-time";

const POPULAR_ICONS = ["Accessibility", "Activity", "AlertTriangle", "AudioLines", "Baby", "BadgeCheck", "Bell", "Calendar", "Camera", "Captions", "Check", "Clock", "Ear", "Eye", "Flame", "Heart", "Info", "Languages", "ListX", "MapPin", "Mic", "Monitor", "MonitorPlay", "Play", "Settings", "Shield", "Sparkles", "Star", "Subtitles", "Ticket", "Tv", "User", "Users", "Volume2", "Wheelchair"];

type TabView = "general" | "movies" | "badges" | "screenings" | "auxiliary";

interface Movie {
  title: string;
  posterUrl: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabView>("movies");
  const [devMode, setDevMode] = useState(false);
  
  const [config, setConfig] = useState<AppConfig>({
    dateOverride: "",
    mockMoviesCount: 0,
    moviesColumnPercentage: 100,
    movies: {},
    badges: {
      "Wheelchair Accessibility": { iconName: "Accessibility" },
      "Stairs": { iconName: "Kanban" },
      "Open Captions": { iconName: "Captions" }
    },
    sessionBadges: {}
  });

  const [saving, setSaving] = useState(false);
  const [apiMovies, setApiMovies] = useState<Record<string, Movie>>({});
  const [apiSessions, setApiSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newBadgeName, setNewBadgeName] = useState("");
  const [badgeDateFilter, setBadgeDateFilter] = useState("");

  const isInitialMount = useRef(true);

  useEffect(() => {
    fetch("/api/showings")
      .then(async (apiRes) => {
        if (!apiRes.ok) throw new Error("Unable to load the Eventive schedule.");
        const apiData = await apiRes.json();
        
        if (typeof window !== "undefined" && window.location.hash.length > 1) {
           try {
              const raw = LZString.decompressFromBase64(window.location.hash.slice(1));
              if (raw) {
                const data = JSON.parse(raw);
                if (!data.movies) data.movies = {};
                if (!data.badges) data.badges = {};
                if (!data.sessionBadges) data.sessionBadges = {};
                setConfig(data);
              }
           } catch (e) {
              console.error("Failed to parse config from URL hash", e);
           }
        }

        const sessions = Array.isArray(apiData) ? apiData : apiData.sessions || [];
        const upcomingSessions = sessions.filter((s: any) => new Date(s.FeatureEndTime) > new Date());
        setApiSessions(Array.from(new Map(upcomingSessions.map((s: any) => [s.Id, s])).values()));
        const fetchedMovies: Record<string, Movie> = {};
        sessions.forEach((s: any) => {
          if (!fetchedMovies[s.FilmId]) {
            const baseTitle = s.Title;
            fetchedMovies[s.FilmId] = {
              title: baseTitle,
              posterUrl: s.ExtractedImgixUrl || "/poster-placeholder.svg"
            };
          }
        });
        setApiMovies(fetchedMovies);
        setLoading(false);
      }).catch(() => {
        toast.error("Unable to load the Eventive schedule. Please refresh to retry.");
        setLoading(false);
      });
  }, []);

  const generateSignageUrl = () => {
    const raw = JSON.stringify(config);
    const compressed = LZString.compressToBase64(raw);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/#${compressed}`;
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(generateSignageUrl());
      toast.success("TFFM TV URL copied to clipboard!");
    } catch {
      alert("Failed to copy directly. Please manually copy the URL from your browser address bar.");
    }
  };

  // Auto-update URL hash
  useEffect(() => {
    if (loading) return; 
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const timer = setTimeout(() => {
      const raw = JSON.stringify(config);
      const compressed = LZString.compressToBase64(raw);
      window.history.replaceState(null, "", `#${compressed}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [config, loading]);

  const updateMovie = (fsId: string, field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      movies: {
        ...prev.movies,
        [fsId]: { ...prev.movies[fsId], [field]: value },
      },
    }));
  };

  const updateBadge = (name: string, field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      badges: {
        ...prev.badges,
        [name]: { ...prev.badges[name], [field]: value },
      },
    }));
  };

  const removeBadge = (name: string) => {
    setConfig((prev) => {
      const newBadges = { ...prev.badges };
      delete newBadges[name];
      return { ...prev, badges: newBadges };
    });
  };

  if (loading) return <div className="p-8 text-white">Loading config...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto text-white overflow-y-auto h-screen hide-scrollbar">
      <Toaster toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <div className="flex flex-col gap-4 mb-6 border-b border-brand-dim/30 pb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-brand-accent">Tasveer Signage Settings</h1>
          <button
            onClick={handleCopyUrl}
            className="border border-brand-accent bg-brand-accent/10 text-brand-accent px-6 py-2 rounded font-bold text-lg hover:bg-brand-accent/30 hover:shadow-[0_0_15px_rgba(102,252,241,0.2)] transition-all flex flex-row items-center gap-2"
          >
            <LucideIcons.Copy size={20} /> Copy TV URL
          </button>
        </div>
        <div className="bg-black border border-white/20 p-3 rounded font-mono text-sm text-brand-accent cursor-text select-all overflow-hidden text-ellipsis whitespace-nowrap">
           {typeof window !== "undefined" ? generateSignageUrl() : "Loading URL..."}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap border-b border-brand-dim/30 pb-4 mb-8">
        <button 
          className={`px-4 py-2 border rounded transition-colors whitespace-nowrap ${activeTab === 'general' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent' : 'border-brand-dim/50 text-white hover:bg-white/5'}`} 
          onClick={() => setActiveTab('general')}
        >
          General Config
        </button>
        <button 
          className={`px-4 py-2 border rounded transition-colors whitespace-nowrap ${activeTab === 'movies' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent' : 'border-brand-dim/50 text-white hover:bg-white/5'}`} 
          onClick={() => setActiveTab('movies')}
        >
          Movie Overrides
        </button>
        <button 
          className={`px-4 py-2 border rounded transition-colors whitespace-nowrap ${activeTab === 'badges' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent' : 'border-brand-dim/50 text-white hover:bg-white/5'}`} 
          onClick={() => setActiveTab('badges')}
        >
          Global Badges
        </button>
        <button 
          className={`px-4 py-2 border rounded transition-colors whitespace-nowrap ${activeTab === 'screenings' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent' : 'border-brand-dim/50 text-white hover:bg-white/5'}`} 
          onClick={() => setActiveTab('screenings')}
        >
          Screening Assignment
        </button>
        <button 
          className={`px-4 py-2 border rounded transition-colors whitespace-nowrap ${activeTab === 'auxiliary' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent' : 'border-brand-dim/50 text-white hover:bg-white/5'}`} 
          onClick={() => setActiveTab('auxiliary')}
        >
          Auxiliary Layout
        </button>
      </div>

      <div className="space-y-8 pb-12">
        {/* Global Date Override */}
        {activeTab === 'general' && (
        <section className="bg-card-bg p-6 rounded-lg border border-card-border">
          <h2 className="text-2xl font-bold mb-4 tracking-tight text-brand-accent">General Configuration</h2>
          
          <div className="mt-4 mb-6">
            <h2 className="text-xl font-semibold mb-2 text-brand-accent">Layout Distribution</h2>
            <p className="text-text-dim text-sm mb-4">
              Allocate horizontal screen space between the Primary Movie Schedule and the Auxiliary Content Board.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 w-full max-w-lg">
                <input 
                   type="range" 
                   min="20" 
                   max="100" 
                   step="5"
                   value={config.moviesColumnPercentage ?? 100}
                   onChange={(e) => setConfig((prev) => ({...prev, moviesColumnPercentage: parseInt(e.target.value)}))}
                   className="w-full accent-brand-accent h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white font-bold text-xl min-w-[80px] shrink-0 text-right">
                  {config.moviesColumnPercentage ?? 100}%
                </span>
              </div>
              <div className="flex justify-between w-full max-w-lg text-xs font-bold uppercase tracking-widest text-text-dim px-1">
                <span>Movies</span>
                <span>{100 - (config.moviesColumnPercentage ?? 100)}% Auxiliary</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-card-border pt-6">
            <h2 className="text-xl font-semibold mb-1 text-brand-accent">Auxiliary Zone Overflow</h2>
            <p className="text-text-dim text-sm mb-4">Controls what happens when auxiliary content exceeds the visible area.</p>
            <div className="flex gap-3 flex-wrap">
              {(['fit', 'fill', 'scroll'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setConfig(prev => ({ ...prev, auxScale: mode }))}
                  className={`px-5 py-3 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all ${(config.auxScale ?? 'scroll') === mode ? 'bg-brand-accent/20 border-brand-accent text-brand-accent' : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'}`}
                >
                  {mode === 'fit' ? '⇗ Squish to Fit' : mode === 'fill' ? '⤢ Stretch Fill' : '↕ Scrollable'}
                </button>
              ))}
            </div>
            <p className="text-text-dim text-xs mt-3">
              {(config.auxScale ?? 'scroll') === 'fit' && 'Content is scaled down to fit the viewport—nothing is cut off.'}
              {(config.auxScale ?? 'scroll') === 'fill' && 'Content stretches to fill the full height of the auxiliary area.'}
              {(config.auxScale ?? 'scroll') === 'scroll' && 'Content overflows naturally and becomes scrollable.'}
            </p>
          </div>
          
          <div className="mt-8 border-t border-card-border pt-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1 text-brand-accent">Developer Mode</h2>
              <p className="text-text-dim text-sm">
                Unlock advanced diagnostics, UI testing tools, and layout simulators.
              </p>
            </div>
            <button
               onClick={() => setDevMode(!devMode)}
               className={`w-12 h-6 rounded-full transition-colors flex items-center ${devMode ? 'bg-[#d35400]' : 'bg-white/10 border border-white/20'}`}
            >
               <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${devMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>

          <div className={`transition-all duration-500 overflow-hidden ${devMode ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'}`}>
            <div className="mt-8 border-t border-card-border/50 pt-6">
              <h2 className="text-xl font-semibold mb-2 text-brand-accent flex items-center gap-2">
                <span className="bg-red-500/20 text-red-500 text-xs px-2 py-0.5 rounded uppercase font-black tracking-widest border border-red-500/30">Dev</span>
                Global Date Override
              </h2>
              <p className="text-text-dim text-sm mb-4">
                Locks the signage clock implicitly to a specific past or future date. This actively mocks the incoming API endpoints to test features without altering the layout. Clear field to restore real-time polling.
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={config.dateOverride || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, dateOverride: e.target.value }))}
                  className="bg-black border border-brand-dim rounded p-2 text-white w-full max-w-sm [color-scheme:dark] h-[42px] focus:outline-none focus:border-brand-accent transition-colors"
                />
                {config.dateOverride && (
                  <button 
                    onClick={() => setConfig((prev) => ({ ...prev, dateOverride: "" }))}
                    className="border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded transition h-[42px]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-6 border-t border-card-border/50 pt-6">
              <h2 className="text-xl font-semibold mb-2 text-brand-accent flex items-center gap-2">
                <span className="bg-red-500/20 text-red-500 text-xs px-2 py-0.5 rounded uppercase font-black tracking-widest border border-red-500/30">Dev</span>
                Scale Testing (Responsive Check)
              </h2>
              <p className="text-text-dim text-sm mb-4">
                Simulates a high-density theater day by forcibly cloning movies. Perfect for verifying 8+ grid row geometries! Set to <code>0</code> to restore live data constraints.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={config.mockMoviesCount || 0}
                  onChange={(e) => setConfig((prev) => ({ ...prev, mockMoviesCount: parseInt(e.target.value) || 0 }))}
                  className="bg-black border border-brand-dim rounded p-2 text-white w-24 [color-scheme:dark] h-[42px] focus:outline-none focus:border-brand-accent text-center text-lg font-bold"
                />
                <span className="text-text-dim font-medium uppercase tracking-widest text-xs">Total Movies</span>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Movie Overrides */}
        {activeTab === 'movies' && (
        <section className="bg-card-bg p-6 rounded-lg border border-card-border">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-semibold text-brand-accent">Movie Overrides</h2>
          </div>
          <p className="text-text-dim text-sm mb-4">
            Override the title or poster URL for currently playing movies, or any historical overriding data.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            {Array.from(new Set([...Object.keys(apiMovies), ...Object.keys(config.movies)])).map((filmId) => {
              const defaultData = apiMovies[filmId] || { title: `Unknown Title`, posterUrl: "" };
              const userOverrides = config.movies[filmId] || {};
              const hasOverrides = userOverrides.title || userOverrides.posterUrl;

              return (
                <div key={filmId} className="flex flex-col sm:flex-row gap-4 border border-white/20 p-4 rounded bg-white/5 transition hover:bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={userOverrides.posterUrl || defaultData.posterUrl || "/poster-placeholder.svg"}
                    alt={userOverrides.title || defaultData.title}
                    className="w-24 h-36 object-cover rounded shadow-md shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/poster-placeholder.svg";
                    }}
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-bold border-b border-white/10 pb-2 mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-lg">{defaultData.title}</span>
                          <span className="text-xs text-white/50 font-normal ml-2 bg-black/40 px-2 py-1 rounded">ID: {filmId}</span>
                        </div>
                        {hasOverrides && <span className="text-xs bg-brand-accent px-2 py-1 rounded text-black font-bold shrink-0">Overridden</span>}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="block text-xs text-text-dim mb-1">Custom Title</label>
                          <input
                            type="text"
                            className="w-full bg-black border border-brand-dim p-2 rounded text-sm text-white focus:outline-none focus:border-brand-accent"
                            value={userOverrides.title || ""}
                            onChange={(e) => updateMovie(filmId, "title", e.target.value)}
                            placeholder="Leave blank to use API title"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-dim mb-1">Custom Poster URL</label>
                          <input
                            type="text"
                            className="w-full bg-black border border-brand-dim p-2 rounded text-sm text-white focus:outline-none focus:border-brand-accent"
                            value={userOverrides.posterUrl || ""}
                            onChange={(e) => updateMovie(filmId, "posterUrl", e.target.value)}
                            placeholder="Leave blank to use API image"
                          />
                        </div>
                      </div>
                    </div>
                    {hasOverrides && (
                      <button
                        className="mt-3 text-xs border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1 rounded transition self-start"
                        onClick={() => {
                          updateMovie(filmId, "title", "");
                          updateMovie(filmId, "posterUrl", "");
                        }}
                      >
                        Clear Overrides
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* Badge Overrides */}
        {activeTab === 'badges' && (
        <section className="bg-card-bg p-6 rounded-lg border border-card-border">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-semibold text-brand-accent">Badge Options</h2>
          </div>
          <p className="text-text-dim text-sm mb-4">
            Remap exact badge text to Lucide icon names (e.g. <code>Accessibility</code>, <code>ListX</code>, <code>Captions</code>).
          </p>

          <div className="space-y-4 mb-6">
            {Object.keys(config.badges).map((badgeName) => (
              <div key={badgeName} className="flex flex-col lg:flex-row gap-4 lg:items-end border border-white/20 p-4 rounded bg-white/5 relative">
                <div className="flex-1 w-full">
                   <label className="block text-sm text-text-dim mb-1">Badge Text Key</label>
                   <input
                      type="text"
                      className="w-full bg-black/50 border border-brand-dim/50 p-2 rounded text-white h-[42px]"
                      value={badgeName}
                      disabled
                    />
                </div>
                
                <div className="flex-1 w-full">
                   <label className="block text-sm text-text-dim mb-1">Display Text (Optional)</label>
                   <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. Q&A, VIP"
                      className="w-full bg-black border border-brand-dim p-2 rounded text-white h-[42px] focus:outline-none focus:border-brand-accent"
                      value={config.badges[badgeName].label || ""}
                      onChange={(e) => updateBadge(badgeName, "label", e.target.value)}
                    />
                </div>

                <div className="flex-[1.5] w-full">
                  <label className="block text-sm text-text-dim mb-1">Select Icon</label>
                  <div className="flex items-center gap-3">
                    {(() => {
                       const iName = config.badges[badgeName].iconName || "";
                       const Icon = (LucideIcons as any)[iName] || LucideIcons.CircleHelp;
                       return <Icon size={28} className={iName ? "text-brand-accent shrink-0" : "text-white/30 shrink-0"} />;
                    })()}
                    <select
                      className="w-full bg-black border border-brand-dim p-2 rounded text-white focus:outline-none focus:border-brand-accent h-[42px]"
                      value={config.badges[badgeName].iconName || ""}
                      onChange={(e) => updateBadge(badgeName, "iconName", e.target.value)}
                    >
                      <option value="">Choose Icon...</option>
                      {POPULAR_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <button 
                      onClick={() => removeBadge(badgeName)}
                      className="border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded transition h-[42px] shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                  <label className="flex items-center gap-2 mt-4 cursor-pointer text-sm font-semibold text-brand-accent/90 hover:text-brand-accent transition-colors w-max">
                    <input 
                      type="checkbox" 
                      checked={!!config.badges[badgeName].isHighlighted}
                      onChange={(e) => updateBadge(badgeName, "isHighlighted", e.target.checked)}
                      className="w-4 h-4 accent-brand-accent rounded border border-brand-accent/50 bg-black cursor-pointer"
                    />
                    Highlight this screening type
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Badge String Key..."
              value={newBadgeName}
              onChange={(e) => setNewBadgeName(e.target.value)}
              className="bg-black border border-brand-dim rounded p-2 text-white h-[42px] focus:outline-none focus:border-brand-accent"
            />
            <button
              onClick={() => {
                if (newBadgeName) {
                  updateBadge(newBadgeName, "iconName", "");
                  setNewBadgeName("");
                }
              }}
              className="border border-brand-dim text-white hover:bg-white/10 px-4 py-2 rounded transition h-[42px]"
            >
              Configure New Badge
            </button>
          </div>
        </section>
        )}

        {/* Screening Badges */}
        {activeTab === 'screenings' && (
        <section className="bg-card-bg p-6 rounded-lg border border-card-border">
          <h2 className="text-2xl font-semibold text-brand-accent mb-4">Screening-Specific Badges</h2>
          <p className="text-text-dim text-sm mb-4">Directly assign configured global badges to upcoming screenings.</p>

          <div className="mb-6 flex flex-col md:flex-row md:items-end gap-3">
            <div>
              <label className="block text-sm text-text-dim mb-1">Filter Screenings by Date</label>
              <input 
                type="date"
                className="bg-black border border-brand-dim p-2 rounded text-white h-[42px] min-w-[200px] [color-scheme:dark]"
                value={badgeDateFilter}
                onChange={(e) => setBadgeDateFilter(e.target.value)}
              />
            </div>
            {badgeDateFilter && (
               <button className="border border-brand-dim text-white hover:bg-white/10 px-4 py-2 rounded transition h-[42px] flex items-center" onClick={() => setBadgeDateFilter("")}>
                 Clear Filter
               </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apiSessions.filter(session => {
              if (!badgeDateFilter) return true;
              return festivalDate(session.FeatureStartTime) === badgeDateFilter;
            }).map(session => {
              const assignedBadges = config.sessionBadges[session.Id] || [];
              const availableGlobalBadges = Object.keys(config.badges);
              
              const formatDateTime = (iso: string) => {
                const dateStr = new Date(iso).toLocaleDateString('en-US', {
                  timeZone: FESTIVAL_TIMEZONE, month: 'short', day: 'numeric',
                });
                return `${dateStr} • ${festivalTime(iso)}`;
              };

              return (
                <div key={session.Id} className="border border-white/20 p-4 rounded bg-white/5 hover:bg-white/10 transition relative">
                  <div className="font-bold border-b border-white/10 pb-2 mb-3">
                    <div className="text-lg">{session.EventTitle || session.Title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {session.ScreenName && (
                        <span className="bg-white/10 text-white/90 border border-white/20 text-xs px-2 py-0.5 rounded-full shrink-0">
                          House {session.ScreenName.match(/\d+/) ? session.ScreenName.match(/\d+/)[0] : session.ScreenName}
                        </span>
                      )}
                      <div className="text-sm text-brand-accent">{formatDateTime(session.FeatureStartTime)}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {assignedBadges.map((b: string) => (
                       <div key={b} className="flex justify-between items-center bg-black/50 px-2 py-1 rounded text-sm text-white">
                         <span>{b}</span>
                         <button className="text-red-400 hover:text-red-300 font-bold" onClick={() => {
                            const newArr = assignedBadges.filter((a: string) => a !== b);
                            setConfig(prev => ({
                              ...prev,
                              sessionBadges: { ...prev.sessionBadges, [session.Id]: newArr }
                            }));
                         }}>✕</button>
                       </div>
                    ))}
                  </div>

                  <select
                     className="w-full bg-black border border-brand-dim p-2 rounded text-white text-sm focus:outline-none focus:border-brand-accent h-[38px]"
                     value=""
                     onChange={(e) => {
                       if(e.target.value) {
                         const bName = e.target.value;
                         if (!assignedBadges.includes(bName)) {
                            setConfig(prev => ({
                              ...prev,
                              sessionBadges: { ...prev.sessionBadges, [session.Id]: [...assignedBadges, bName] }
                            }));
                         }
                       }
                     }}
                  >
                     <option value="">+ Add Badge...</option>
                     {availableGlobalBadges.map(gb => <option key={gb} value={gb}>{gb}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* Auxiliary Visual Builder Route */}
        {activeTab === 'auxiliary' && (
        <section className="bg-card-bg p-6 rounded-lg border border-card-border animate-in fade-in zoom-in duration-300">
          <h2 className="text-2xl font-bold mb-4 tracking-tight text-brand-accent">Auxiliary Design Studio</h2>
          <p className="text-text-dim text-sm mb-6">
            Construct dynamic layout combinations natively matching the primary screen aesthetic. Easily embed structural tables, HTML rich-text, and direct images without touching code infrastructure. Ensure your <button onClick={() => setActiveTab('general')} className="text-brand-accent underline">General Configuration width</button> is pulled below 100% to visualize this layout natively!
          </p>
          <AuxiliaryEditor 
            layout={config.auxLayout} 
            onChange={(newNode) => setConfig((prev) => ({ ...prev, auxLayout: newNode }))} 
          />
        </section>
        )}

      </div>
    </div>
  );
}
