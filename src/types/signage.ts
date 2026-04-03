export interface Showing {
  Id: number;
  FilmId: number;
  Title: string;
  FilmTitle: string;
  Rating: string;
  ScreenName: string;
  FeatureStartTime: string;
  FeatureEndTime: string;
  ShowingBadges?: string[];
  ExtractedImgixUrl?: string | null;
}

export interface MovieGroup {
  FilmId: number;
  Title: string;
  metaInfo?: string | null;
  Rating: string;
  posterUrl: string;
  showings: Showing[];
}

export interface AppConfig {
  dateOverride: string;
  mockMoviesCount?: number;
  movies: Record<string, { title?: string; posterUrl?: string }>;
  badges: Record<string, { iconName?: string; label?: string }>;
  sessionBadges: Record<string, string[]>;
}
