import assert from 'node:assert/strict';
import test from 'node:test';
import { eventiveShowings } from '../src/lib/eventive.ts';
import { festivalDate, festivalTime, scheduleDate } from '../src/lib/signage-time.ts';

const screening = {
  id: 'event-1', name: 'Shorts program', visibility: 'visible',
  is_virtual: false, is_dated: true,
  start_time: '2026-10-14T02:30:00Z', end_time: '2026-10-14T04:30:00Z',
  venue: { short_name: 'House 02' },
  films: [
    { id: 'film-1', name: 'Gaa Ghar (Home)', poster_image: 'https://example.com/poster.jpg', details: { runtime: '9' } },
    { id: 'film-2', name: 'Second film', cover_image: 'https://example.com/cover.jpg' },
  ],
  quantity_sold: 100, internal_note: 'Do not expose this',
};

test('a film program preserves film IDs, titles, venue and shared screening time', () => {
  const showings = eventiveShowings([screening]);
  assert.equal(showings.length, 2);
  assert.deepEqual(showings.map(s => s.FilmId), ['film-1', 'film-2']);
  assert.ok(showings.every(s => s.Id === 'event-1' && s.ScreenName === 'House 02'));
  assert.equal(showings[0].Title, 'Gaa Ghar (Home)');
  assert.equal(showings[0].MetaInfo, '9 min');
  assert.equal(showings[0].ExtractedImgixUrl, screening.films[0].poster_image);
  assert.ok(showings.every(s => !('quantity_sold' in s) && !('internal_note' in s)));
});

test('hidden, virtual, undated and malformed screenings are excluded', () => {
  const events = [
    { ...screening, visibility: 'hidden' },
    { ...screening, is_virtual: true },
    { ...screening, is_dated: false },
    { ...screening, start_time: 'invalid' },
    { ...screening, end_time: screening.start_time },
    { ...screening, films: [{ id: 'hidden-film', name: 'Private', visibility: 'hidden' }] },
  ];
  assert.deepEqual(eventiveShowings(events), []);
});

test('festival sessions without films use the event ID and a local poster fallback', () => {
  const [session] = eventiveShowings([{ ...screening, name: 'Market reception', films: [] }]);
  assert.equal(session.Title, 'Market reception');
  assert.equal(session.FilmId, screening.id);
  assert.equal(session.ExtractedImgixUrl, '/poster-placeholder.svg');
});

test('Seattle dates and 9:30 PM rollover are independent of the host timezone', () => {
  assert.equal(festivalDate('2026-10-14T02:30:00Z'), '2026-10-13');
  assert.equal(festivalTime('2026-10-14T02:30:00Z'), '7:30 PM');
  assert.equal(scheduleDate(new Date('2026-10-14T04:29:00Z')), '2026-10-13');
  assert.equal(scheduleDate(new Date('2026-10-14T04:30:00Z')), '2026-10-14');
  assert.equal(scheduleDate(new Date('2027-01-01T05:30:00Z')), '2027-01-01');
});

const { eventivePrograms } = await import('../src/lib/eventive.ts');
const { festivalInstant } = await import('../src/lib/signage-time.ts');
const { programLanes, timelineOrigin } = await import('../src/lib/timeline.ts');

test('one program contains its film list, event image and canonical house', () => {
  const event = { ...screening, name: 'Shorts program: Gaa Ghar (Home) | Second film', images: { cover: 'https://example.com/program.jpg' } };
  const programs = eventivePrograms([event, event]);
  assert.equal(programs.length, 1);
  assert.equal(programs[0].title, 'Shorts program');
  assert.equal(programs[0].house, 'House 2');
  assert.equal(programs[0].image, event.images.cover);
  assert.deepEqual(programs[0].films.map(film => film.title), ['Gaa Ghar (Home)', 'Second film']);
});

test('programs expose only aggregate attendance and capacity, preserving zero and unlimited', () => {
  const [program] = eventivePrograms([{ ...screening, quantity_sold: 54, quantity: 185 }]);
  assert.equal(program.attendeeCount, 54);
  assert.equal(program.totalQuantity, 185);
  assert.equal(program.unlimited, false);
  assert.ok(!('internal_note' in program) && !('ticket_buckets' in program));
  const [empty] = eventivePrograms([{ ...screening, quantity_sold: 0, quantity: 0 }]);
  assert.equal(empty.attendeeCount, 0);
  assert.equal(empty.totalQuantity, 0);
  const [unlimited] = eventivePrograms([{ ...screening, quantity_sold: 10, unlimited: true }]);
  assert.equal(unlimited.unlimited, true);
  assert.equal(unlimited.totalQuantity, null);
});

test('missing or invalid counts remain unavailable rather than reporting zero attendees', () => {
  for (const value of [undefined, null, -1, 1.5, '100', Infinity]) {
    const [program] = eventivePrograms([{ ...screening, quantity_sold: value, quantity: value }]);
    assert.equal(program.attendeeCount, null);
    assert.equal(program.totalQuantity, null);
  }
});

test('sessions require House 1–3 or Blue Room, including location fallbacks', () => {
  const events = [
    { ...screening, id: 'blue', films: [], venue: { name: 'Tasveer Blue Room' } },
    { ...screening, id: 'fallback', films: [], venue: {}, location: 'Tasveer Film Center-House 03' },
    { ...screening, id: 'outside', films: [], venue: { name: 'Royal Room' } },
    { ...screening, id: 'wrong-house', venue: { name: 'House 12' } },
    { ...screening, id: 'hidden', visibility: 'hidden' },
  ];
  assert.deepEqual(eventivePrograms(events).map(p => p.house), ['Blue Room', 'House 3']);
});

test('overlapping programs get separate lanes and advancing time moves cards left', () => {
  const [program] = eventivePrograms([screening]);
  const overlapping = { ...program, id: 'overlap', startTime: '2026-10-14T03:00:00Z' };
  const later = { ...program, id: 'later', startTime: '2026-10-14T05:00:00Z', endTime: '2026-10-14T06:00:00Z' };
  assert.deepEqual(programLanes([program, overlapping, later], 6, 260).map(p => p.lane), [0, 1, 0]);
  const now = Date.parse('2026-10-14T03:00:00Z');
  const initial = timelineOrigin(now - 3600000, now, 6, 90);
  const advanced = timelineOrigin(now - 3600000, now + 60000, 6, 90);
  assert.equal(advanced - initial, 60000);
  assert.equal((now - advanced) / 60000 * 6, 84);
});

test('preview times use Seattle timezone in summer and winter', () => {
  assert.equal(new Date(festivalInstant('2026-10-13', '19:00')).toISOString(), '2026-10-14T02:00:00.000Z');
  assert.equal(new Date(festivalInstant('2027-01-01', '19:00')).toISOString(), '2027-01-02T03:00:00.000Z');
});


test('program film suffixes are removed even when film order differs', () => {
  const event = { ...screening, name: 'Shorts program: Second film | Gaa Ghar (Home)' };
  const [program] = eventivePrograms([event]);
  assert.equal(program.title, 'Shorts program');
  assert.equal(program.image, screening.films[0].poster_image);
});

test('back-to-back programs share a lane', () => {
  const [program] = eventivePrograms([screening]);
  const next = { ...program, id: 'next', startTime: program.endTime, endTime: '2026-10-14T06:00:00Z' };
  assert.deepEqual(programLanes([program, next], 6, 260).map(p => p.lane), [0, 0]);
});

const { defaultDisplayDate } = await import('../src/lib/signage-time.ts');

test('October 12 previews October 13, then normal dates resume at midnight', () => {
  assert.equal(defaultDisplayDate('2026-10-12'), '2026-10-13');
  assert.equal(defaultDisplayDate('2026-10-13'), '2026-10-13');
  assert.equal(defaultDisplayDate('2026-10-14'), '2026-10-14');
  assert.equal(defaultDisplayDate(''), '');
});
