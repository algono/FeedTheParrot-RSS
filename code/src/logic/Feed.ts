export interface FeedItem {
  title: string;
  description: string;
  summary: string;
  date: string;
  link: string;
  imageUrl?: string;

  content?: string[];
}

export interface FeedItems {
  list: FeedItem[];
  langFormatter?: string;
}

export interface FeedData {
  readonly url: string;
  language?: string;

  truncateContentAt?: number;
  itemLimit?: number;
}

export interface Feed extends FeedData {
  name: string;
}
