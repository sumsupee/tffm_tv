import type { EventiveEvent } from './eventive';

export class EventiveError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function loadEventiveEvents(): Promise<EventiveEvent[]> {
  const bucketId = process.env.EVENTIVE_EVENT_BUCKET_ID;
  const apiKey = process.env.EVENTIVE_API_KEY;
  if (!bucketId || !apiKey) throw new EventiveError(503, 'Eventive is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const url = new URL(`https://api.eventive.org/event_buckets/${encodeURIComponent(bucketId)}/events`);
    url.searchParams.set('api_key', apiKey);
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (TFFM-TV)' },
      cache: 'no-store', signal: controller.signal,
    });
    if (!response.ok) throw new EventiveError(502, 'Unable to load the Eventive schedule.');
    const data = await response.json();
    if (!Array.isArray(data.events) || data.includes_all_events === false) throw new EventiveError(502, 'Eventive returned an incomplete schedule.');
    return data.events;
  } catch (error) {
    if (error instanceof EventiveError) throw error;
    // Discard upstream error objects, which can contain the account key in URLs.
    throw new EventiveError(502, 'Unable to load the Eventive schedule.');
  } finally { clearTimeout(timeout); }
}
