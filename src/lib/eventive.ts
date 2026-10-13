import type { Showing, House, Program } from '../types/signage';

interface EventiveFilm {
  id: string;
  name: string;
  visibility?: string;
  poster_image?: string;
  cover_image?: string;
  details?: { country?: string; language?: string; runtime?: string };
}

export interface EventiveEvent {
  id: string;
  name: string;
  visibility: string;
  is_virtual: boolean;
  is_dated: boolean;
  start_time?: string;
  end_time?: string;
  location?: string;
  venue?: { name?: string; short_name?: string };
  films?: EventiveFilm[];
  images?: { cover?: string; avatar?: string };
  quantity_sold?: number;
  quantity?: number;
  unlimited?: boolean;
}

export function eventHouse(event: EventiveEvent): House | null {
  for (const location of [event.venue?.short_name, event.venue?.name, event.location]) {
    if (!location) continue;
    const house = location.match(/\bhouse[\s_-]*0?([123])\b/i);
    if (house) return `House ${house[1]}` as House;
    if (/\bblue[\s_-]*room\b/i.test(location)) return 'Blue Room';
  }
  return null;
}

// A program is an Eventive event, regardless of the number of films it contains.
export function eventivePrograms(events: EventiveEvent[]): Program[] {
  const programs = new Map<string, Program>();
  for (const event of events) {
    const house = eventHouse(event);
    const start = Date.parse(event.start_time || '');
    const end = Date.parse(event.end_time || '');
    if (!house || event.visibility !== 'visible' || event.is_virtual || !event.is_dated || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const films = (event.films || []).filter(film => !film.visibility || film.visibility === 'visible');
    if (event.films?.length && !films.length) continue;
    // Eventive appends the film list to some program names after a colon.
    const separator = event.name.indexOf(': ');
    const listedFilms = separator >= 0 ? event.name.slice(separator + 2).split(' | ').map(name => name.trim()).sort() : [];
    const filmNames = films.map(film => film.name.trim()).sort();
    const hasFilmSuffix = filmNames.length > 0 && separator >= 0 &&
      (event.name.slice(separator + 2).includes(' | ') || JSON.stringify(listedFilms) === JSON.stringify(filmNames));
    const title = hasFilmSuffix ? event.name.slice(0, separator).trim() : event.name.trim();
    programs.set(event.id, {
      id: event.id, title, house,
      startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(),
      image: event.images?.cover || event.images?.avatar || films[0]?.cover_image || films[0]?.poster_image || '/poster-placeholder.svg',
      films: films.map(film => ({ id: film.id, title: film.name, runtime: film.details?.runtime })),
      attendeeCount: Number.isSafeInteger(event.quantity_sold) && event.quantity_sold! >= 0 ? event.quantity_sold! : null,
      totalQuantity: Number.isSafeInteger(event.quantity) && event.quantity! >= 0 ? event.quantity! : null,
      unlimited: event.unlimited === true,
    });
  }
  return [...programs.values()].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}

// Return only public display fields. The account API also returns ticketing and
// internal data, which must never be forwarded wholesale to the kiosk browser.
export function eventiveShowings(events: EventiveEvent[]): Showing[] {
  return events.flatMap((event) => {
    if (event.visibility !== 'visible' || event.is_virtual || !event.is_dated) return [];
    const start = Date.parse(event.start_time || '');
    const end = Date.parse(event.end_time || '');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

    const films = event.films || [];
    const publicFilms = films.filter((film) => !film.visibility || film.visibility === 'visible');
    if (films.length && !publicFilms.length) return [];

    // Non-film festival sessions remain available alongside screenings.
    return (publicFilms.length ? publicFilms : [null]).map((film) => ({
      Id: event.id,
      FilmId: film?.id || event.id,
      Title: film?.name || event.name,
      FilmTitle: film?.name || event.name,
      EventTitle: event.name,
      Rating: '',
      ScreenName: event.venue?.short_name || event.venue?.name || event.location || 'Venue TBA',
      FeatureStartTime: new Date(start).toISOString(),
      FeatureEndTime: new Date(end).toISOString(),
      ShowingBadges: [],
      ExtractedImgixUrl: film?.poster_image || film?.cover_image || event.images?.cover || event.images?.avatar || '/poster-placeholder.svg',
      MetaInfo: film ? [film.details?.country, film.details?.language, film.details?.runtime ? `${film.details.runtime} min` : ''].filter(Boolean).join(' · ') : '',
    }));
  }).sort((a, b) => Date.parse(a.FeatureStartTime) - Date.parse(b.FeatureStartTime));
}
