
export interface AnimeCharacter {
  name: string;
  series: string;
  category: Category;
}

export type Category = 'Anime' | 'Animated' | 'TV Shows' | 'Custom';

export interface SeriesGroup {
  series: string;
  category: Category;
  characters: string[];
}

export interface GeneratedImage {
  id: string;
  url: string | null;
  prompt: string;
  status: 'queued' | 'completed' | 'error';
  errorMessage?: string;
  timestamp: number;
}
