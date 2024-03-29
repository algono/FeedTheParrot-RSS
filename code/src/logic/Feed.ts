export interface FeedItem {
  title: string;
  description: string;
  summary: string;
  date: string;
  link: string;
  categories: string[];
  imageUrl?: string;

  content?: string[];

  podcast?: Podcast
}

export interface Podcast {
  url: string;
  length?: string;
}

export interface FeedItems {
  list: FeedItem[];
  langFormatter?: string;
}

export type FilterMatch = 'any' | 'all';

export interface FeedFilter {
  values: string[]
  matchAll: FilterMatch
}

export interface FeedFilters {
  text?: FeedFilter;
  category?: FeedFilter;
}

export interface FeedData {
  readonly url: string;
  language?: string;

  readFullContent?: boolean;
  truncateContentAt?: number;
  itemLimit?: number;
  
  filters?: FeedFilters
}

export interface Feed extends FeedData {
  name: string;
}
