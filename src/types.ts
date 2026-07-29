export interface Player {
  id: string;       // UUID — unique per session
  name: string;
  avatar: string;
  hasVoted: boolean;
  voteDev: string | null;   // string covers numbers, '?', '½', 'XS', etc.
  voteQa: string | null;
  isOrganizer: boolean;
}

export interface GameConfig {
  id: string;       // Supabase games.id — doubles as roomId
  name: string;
  deck: DeckKey;
  taskType: TaskTypeKey;
}

// Routing handles 'landing' and 'setup'; this type covers the in-game states only
export type PlayingState = 'playing' | 'countdown' | 'results';

export type DeckKey = 'DAYS' | 'HOURS' | 'TSHIRT' | 'STORY' | 'POWERS';

export type TaskTypeKey = 'DEV' | 'QA' | 'BOTH';

export interface VoteStats {
  mean: number | null;   // null for non-numeric decks (T-shirt)
  stdDev: number | null;
  /** Raw vote strings, excluding '?' */
  rawVotes: string[];
  /** Numeric votes used for mean/stdDev calculation (null for non-numeric decks) */
  numericVotes: number[] | null;
}

export interface Stats {
  dev: VoteStats;
  qa: VoteStats;
}
