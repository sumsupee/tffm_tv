import { NextResponse } from 'next/server';
import { eventivePrograms } from '@/lib/eventive';
import { loadEventiveEvents, EventiveError } from '@/lib/eventive-api';

export async function GET() {
  try {
    return NextResponse.json(eventivePrograms(await loadEventiveEvents()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof EventiveError ? error.message : 'Unable to load the schedule.' }, { status: error instanceof EventiveError ? error.status : 502 });
  }
}
