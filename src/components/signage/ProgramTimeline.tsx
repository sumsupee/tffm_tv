"use client";

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AppConfig, Program } from '@/types/signage';
import { festivalTime } from '@/lib/signage-time';
import { HOUSES, MINUTE, programLanes, timelineBounds, timelineOrigin } from '@/lib/timeline';

const COLORS = ['#277f87', '#916331', '#675795', '#3674b8'];

export default function ProgramTimeline({ programs, now, config }: { programs: Program[]; now: number; config: AppConfig }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1400);
  const [height, setHeight] = useState(800);
  const [browseOrigin, setBrowseOrigin] = useState<number | null>(null);
  useEffect(() => {
    const update = () => { setWidth(viewport.current?.clientWidth || 1400); setHeight(viewport.current?.clientHeight || 800); };
    update();
    if (!viewport.current || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  const pixelsPerMinute = Math.max(12, width / 150);
  const minimumWidth = 260;
  const bounds = timelineBounds(programs, now);
  const start = bounds.start - 30 * MINUTE;
  const nowX = 90;
  const origin = browseOrigin ?? timelineOrigin(start, now, pixelsPerMinute, nowX);
  const position = (time: number) => (time - origin) / MINUTE * pixelsPerMinute;
  const currentX = position(now);
  const ticks: number[] = [];
  const firstTick = Math.floor(origin / (30 * MINUTE)) * 30 * MINUTE;
  for (let time = firstTick; time < origin + width / pixelsPerMinute * MINUTE + 30 * MINUTE; time += 30 * MINUTE) ticks.push(time);
  const rows = HOUSES.map(house => {
    const inView = programs.filter(program => program.house === house &&
      Math.max(Date.parse(program.endTime), Date.parse(program.startTime) + minimumWidth / pixelsPerMinute * MINUTE) > origin &&
      Date.parse(program.startTime) < origin + width / pixelsPerMinute * MINUTE);
    const placements = programLanes(inView, pixelsPerMinute, minimumWidth);
    const lanes = Math.max(1, ...placements.map(item => item.lane + 1));
    return { house, placements, lanes };
  });
  const totalLanes = rows.reduce((sum, row) => sum + (row.placements.length ? row.lanes : 0.35), 0);
  const compact = (height - 45) / totalLanes - 18 < 190;
  const inset = compact ? 4 : 9;

  return (
    <div className="program-timeline">
      <div className="timeline-label-column">
        <div className="timeline-label-heading">VENUE</div>
        {rows.map((row, index) => <div key={row.house} className={'timeline-house-label' + (!row.placements.length ? ' timeline-house-empty' : '')} style={{ flex: row.placements.length ? row.lanes : 0.35, '--house-color': COLORS[index] } as CSSProperties}>
          <span>{row.house === 'Blue Room' ? 'BLUE' : 'HOUSE'}</span><strong>{row.house === 'Blue Room' ? 'ROOM' : index + 1}</strong>
        </div>)}
      </div>
      <div className="timeline-right">
        <div className="timeline-viewport" ref={viewport}>
          <div className="timeline-ruler">{ticks.map(time => <div key={time} className="timeline-hour-label" style={{ left: position(time) }}>{festivalTime(new Date(time))}</div>)}</div>
          <div className="timeline-rows">
            {rows.map((row, index) => <div key={row.house} className="timeline-house-row" style={{ flex: row.placements.length ? row.lanes : 0.35, '--house-color': COLORS[index] } as CSSProperties}>
              {ticks.map(time => <div key={time} className="timeline-gridline" style={{ left: position(time) }} />)}
              {!row.placements.length && <span className="timeline-room-note">No programs scheduled</span>}
              {row.placements.map(({ program, lane }) => {
                const left = position(Date.parse(program.startTime));
                const durationWidth = (Date.parse(program.endTime) - Date.parse(program.startTime)) / MINUTE * pixelsPerMinute;
                const cardWidth = Math.max(minimumWidth, durationWidth - 10);
                if (left + cardWidth < 0 || left > width) return null;
                const playing = now >= Date.parse(program.startTime) && now < Date.parse(program.endTime);
                const ended = now >= Date.parse(program.endTime);
                const badges = config.sessionBadges?.[program.id] || [];
                const clipped = Math.max(0, -left);
                const readableWidth = Math.max(0, Math.min(cardWidth - clipped, width - Math.max(0, left)));
                const filmColumns = program.films.length > 9 && readableWidth > 900 ? 4 : program.films.length > 6 && readableWidth > 720 ? 3 : program.films.length > 3 && readableWidth > 450 ? 2 : 1;
                return <article key={program.id} className={'program-card' + (compact ? ' program-compact' : '') + (playing ? ' program-playing' : '') + (ended ? ' program-ended' : '')} style={{ left, width: cardWidth, top: `calc(${lane * 100 / row.lanes}% + ${inset}px)`, height: `calc(${100 / row.lanes}% - ${inset * 2}px)` }} aria-label={`${program.title}, ${program.house}, ${festivalTime(program.startTime)}`}>
                  <div className="program-card-body" style={{ marginLeft: clipped, width: readableWidth }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="program-image" src={program.image} alt={program.title} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/poster-placeholder.svg'; }} />
                    <div className="program-copy">
                      <div className="program-heading"><h2>{config.movies?.[program.id]?.title || program.title}</h2>{playing && <span className="program-live-badge">NOW SHOWING</span>}</div>
                      <div className="program-meta"><time>{festivalTime(program.startTime)} – {festivalTime(program.endTime)}</time><span>{program.house}</span>{badges.map(badge => <span key={badge} className="program-custom-badge">{config.badges?.[badge]?.label || badge}</span>)}</div>
                      {program.films.length ? <ul className="program-films">
                        {program.films.map(film => <li key={film.id} style={{ width: `${100 / filmColumns}%` }}><span>{config.movies?.[film.id]?.title || film.title}</span>{film.runtime && <small>{film.runtime}m</small>}</li>)}
                      </ul> : <div className="program-session-label">FESTIVAL & MARKET SESSION</div>}
                    </div>
                  </div>
                  <div className="program-duration-bar" style={{ width: Math.min(100, durationWidth / cardWidth * 100) + '%' }} />
                </article>;
              })}
            </div>)}
          </div>
          {currentX >= 0 && currentX <= width && <div className="timeline-now" style={{ left: currentX }}><span>NOW</span><div /></div>}
          {currentX > 0 && <div className="timeline-past" style={{ width: Math.min(width, currentX) }} />}
        </div>
      </div>
      <div className="timeline-navigation"><span>{browseOrigin === null ? 'Following current time' : 'Browsing the day'}</span><input aria-label="Browse the whole day" type="range" min={start} max={bounds.end} step={5 * MINUTE} value={Math.min(bounds.end, Math.max(start, origin))} onChange={event => setBrowseOrigin(Number(event.target.value))} /><button onClick={() => setBrowseOrigin(null)}>{browseOrigin === null ? 'LIVE' : 'Follow now'}</button></div>
    </div>
  );
}
