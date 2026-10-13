"use client";

import { useEffect, useMemo, useState } from 'react';
import LZString from 'lz-string';
import type { AppConfig, Program } from '@/types/signage';
import { DEFAULT_CONFIG } from '@/types/signage';
import { FESTIVAL_TIMEZONE, defaultDisplayDate, festivalDate, festivalInstant, festivalTime } from '@/lib/signage-time';
import ProgramTimeline from '@/components/signage/ProgramTimeline';
import ScaledAuxZone from '@/components/signage/ScaledAuxZone';
import AuxRenderer from '@/components/signage/AuxRenderer';

export default function Home() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [clock, setClock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewTime, setPreviewTime] = useState('');
  const [previewStarted, setPreviewStarted] = useState(0);

  useEffect(() => {
    function readConfig() {
      try {
        const raw = LZString.decompressFromBase64(window.location.hash.slice(1));
        setConfig(raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG);
      } catch { setConfig(DEFAULT_CONFIG); }
    }
    readConfig();
    setPreviewTime(new URLSearchParams(window.location.search).get('previewTime') || '');
    setPreviewStarted(Date.now());
    setClock(Date.now());
    const interval = setInterval(() => setClock(Date.now()), 1000);
    window.addEventListener('hashchange', readConfig);
    return () => { clearInterval(interval); window.removeEventListener('hashchange', readConfig); };
  }, []);

  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;
    async function refresh() {
      if (controller) return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8_000);
      try {
        const response = await fetch('/api/programs', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Schedule unavailable');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid schedule');
        if (mounted) { setPrograms(data); setError(false); }
      } catch { if (mounted) setError(true); }
      finally { clearTimeout(timeout); controller = null; if (mounted) setLoading(false); }
    }
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => { mounted = false; clearInterval(interval); controller?.abort(); };
  }, []);

  const actualDate = clock ? festivalDate(new Date(clock)) : '';
  const selectedDate = config.dateOverride || defaultDisplayDate(actualDate);
  const tomorrowPreview = !config.dateOverride && selectedDate !== actualDate;
  const dayPrograms = useMemo(() => programs.filter(program => festivalDate(program.startTime) === selectedDate), [programs, selectedDate]);
  const preview = Boolean(clock && selectedDate !== actualDate) || Boolean(previewTime);
  const firstStart = dayPrograms[0] ? Date.parse(dayPrograms[0].startTime) - 15 * 60_000 : null;
  const simulatedStart = selectedDate && previewTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(previewTime) ? festivalInstant(selectedDate, previewTime) : firstStart;
  const displayNow = clock === null ? null : tomorrowPreview && !previewTime ? clock + 24 * 60 * 60_000 : preview ? (simulatedStart ?? clock) + Math.max(0, clock - previewStarted) : clock;
  const movieShare = Math.min(100, Math.max(10, config.moviesColumnPercentage ?? 100));
  const dateLabel = selectedDate ? new Intl.DateTimeFormat('en-US', { timeZone: FESTIVAL_TIMEZONE, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(festivalInstant(selectedDate, '12:00'))) : '';

  function changeDate(date: string) {
    const next = { ...config, dateOverride: date };
    setConfig(next);
    window.history.replaceState(null, '', '#' + LZString.compressToBase64(JSON.stringify(next)));
    setPreviewStarted(Date.now());
  }

  return (
    <main className="tv-display">
      <header className="tv-header">
        <div className="tv-brand"><strong>TASVEER</strong><span>FILM FESTIVAL & MARKET <b>2026</b></span></div>
        <div className="tv-date"><span>{preview ? 'PREVIEW' : 'TODAY'}</span><label>{dateLabel}<input aria-label="Schedule date" type="date" value={selectedDate} onChange={event => changeDate(event.target.value)} /></label></div>
        <div className="tv-clock"><span>SEATTLE TIME</span><strong>{displayNow ? festivalTime(new Date(displayNow)) : '—'}</strong></div>
      </header>
      <div className="tv-content">
        <section className="tv-timeline-zone" style={{ flex: movieShare }} aria-label="Program schedule">
          {clock === null || loading ? <div className="tv-message">Loading the festival schedule…</div> : <ProgramTimeline key={selectedDate} programs={dayPrograms} now={displayNow ?? clock} config={config} />}
          {!loading && dayPrograms.length === 0 && <div className="tv-empty">{error ? 'Schedule unavailable. Retrying…' : 'No programs scheduled in these rooms on this date.'}</div>}
        </section>
        {movieShare < 100 && config.auxLayout && <aside className="tv-aux" style={{ flex: 100 - movieShare }}>
          {config.auxScale === 'fit' ? <ScaledAuxZone node={config.auxLayout} /> : <AuxRenderer node={config.auxLayout} />}
        </aside>}
      </div>
      <footer className="tv-footer">
        <span className={error ? 'tv-status tv-status-error' : 'tv-status'}>{error ? 'Update unavailable · retrying' : 'Eventive schedule · updates every minute'}</span>
        {preview && <label className="tv-preview-time">Preview time <input aria-label="Preview time" type="time" value={previewTime} onChange={event => { setPreviewTime(event.target.value); setPreviewStarted(Date.now()); }} /></label>}
        <div>{preview && <button onClick={() => { setPreviewTime(''); changeDate(actualDate); }}>Return to today</button>}<a href={'/settings#' + LZString.compressToBase64(JSON.stringify(config))}>Display settings ↗</a></div>
      </footer>
    </main>
  );
}
