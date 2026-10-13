import type { Program } from '../types/signage';

export const HOUSES = ['House 1', 'House 2', 'House 3', 'Blue Room'] as const;
export const MINUTE = 60_000;

// Pack genuine time overlaps AND minimum-width cards into separate sublanes.
// Card widths remain tied to their event durations; no program covers another.
export function programLanes(programs: Program[], pixelsPerMinute: number, minWidth: number) {
  const ends: number[] = [];
  return programs.map(program => {
    const start = Date.parse(program.startTime);
    const end = Math.max(Date.parse(program.endTime), start + minWidth / pixelsPerMinute * MINUTE);
    let lane = ends.findIndex(previousEnd => previousEnd <= start);
    if (lane === -1) lane = ends.length;
    ends[lane] = end;
    return { program, lane };
  });
}

export function timelineBounds(programs: Program[], now: number) {
  const start = programs.length ? Math.min(...programs.map(p => Date.parse(p.startTime))) : now;
  const end = programs.length ? Math.max(...programs.map(p => Date.parse(p.endTime))) : now + 8 * 60 * MINUTE;
  return { start: Math.floor(start / (60 * MINUTE)) * 60 * MINUTE, end: Math.ceil(end / (60 * MINUTE)) * 60 * MINUTE };
}

export function timelineOrigin(start: number, now: number, pixelsPerMinute: number, nowX: number) {
  return Math.max(start, now - nowX / pixelsPerMinute * MINUTE);
}
