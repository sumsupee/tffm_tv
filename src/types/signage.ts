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

export interface AuxNode {
  id: string;
  type: 'row' | 'col' | 'text' | 'image' | 'video' | 'divider' | 'button';
  children?: AuxNode[];
  content?: string;
  flex?: number;
  stack?: boolean;
  autoStackBelow?: number; // auto-stack columns if flex < this value
  padding?: string; // CSS shorthand e.g. "10px 20px"  (supports negatives)
  margin?: string;  // CSS shorthand e.g. "-10px 0"
  gap?: number;
  autoplay?: boolean;
  loop?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
  style?: Record<string, string>;
}

export interface AppConfig {
  dateOverride: string;
  mockMoviesCount?: number;
  moviesColumnPercentage?: number;
  auxLayout?: AuxNode;
  auxScale?: 'fit' | 'fill' | 'scroll'; // overflow / scale mode for aux zone
  movies: Record<string, { title?: string; posterUrl?: string }>;
  badges: Record<string, { iconName?: string; label?: string; isHighlighted?: boolean }>;
  sessionBadges: Record<string, string[]>;
}

export const DEFAULT_CONFIG: AppConfig = {
  dateOverride: "",
  movies: {},
  badges: {},
  sessionBadges: {},
};
