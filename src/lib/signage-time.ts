export const FESTIVAL_TIMEZONE = 'America/Los_Angeles';

export function festivalDate(value: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FESTIVAL_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function festivalTime(value: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: FESTIVAL_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(value));
}

export function festivalInstant(date: string, time: string): number {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FESTIVAL_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(wall));
  const value = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const represented = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
  return wall + (wall - represented);
}

export function scheduleDate(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: FESTIVAL_TIMEZONE, hour: '2-digit', hourCycle: 'h23',
  }).format(now));
  const date = festivalDate(now);
  // Preserve the original kiosk's switch to tomorrow at 9:30 PM Seattle time.
  if (hour > 21 || (hour === 21 && now.getUTCMinutes() >= 30)) {
    return new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  }
  return date;
}
