export type Entity = { id: string; name: string; subtype?: string; popularity?: number; affinity?: number; tags?: string[]; image?: string; description?: string; disambiguation?: string };
export type Cell = { g: string; lat: number; lon: number; a: number; p: number };
export type Ring = [number, number][];
export type Neighbourhood = { id: string; name: string; affinity: number; popularity: number; km2: number; rings: Ring[] };
export type Spot = { id: string; name: string; lat: number; lon: number; affinity: number; popularity: number; label: "sweet" | "prime"; tasteRank: number; busyRank: number };
export type Place = {
  id: string; name: string; kind: "venue" | "food" | "hotel" | "retail" | "other"; affinity: number; popularity: number;
  lat: number; lon: number; distanceM: number; address?: string; website?: string; phone?: string; neighbourhood?: string;
  description?: string; audience?: string; eventSpaces?: boolean; liveMusic?: boolean; rating?: number; tags: string[]; image?: string;
};

export type QlooCall = { endpoint: string; params: Record<string, string>; ms: number; count: number };
export type TraceEntry = { tool: string; args?: any; ms?: number; qloo?: QlooCall[]; error?: string; note?: string; at?: number };

export type Role = "host" | "copromote" | "guests" | "collab" | "launch";
export type Decision = {
  summary: string;
  spots: { spot_id: string; headline: string; reasoning: string }[];
  partners: { entity_id: string; role: Role; why: string }[];
};

export type ScoutInput = { brandIds: string[]; brandName: string; city: string; goal: string; timing?: string; budget?: string; audience?: string };

export type Scout = {
  input: ScoutInput;
  map?: { locality: { id: string; name: string; lat: number; lon: number } | null; cells: Cell[]; hoods: Neighbourhood[]; spots: Spot[] };
  blocks: Record<string, Place[]>;
  collabs: Entity[];
  artists: Entity[];
  decision?: Decision;
  source?: "agent" | "fallback";
  trace: TraceEntry[];
  finishedAt?: string;
};

export type StoreSummary = {
  domain: string; platform: "shopify" | "website"; title?: string; description?: string; productCount: number;
  categories: string[]; vendors: string[]; tags: string[]; priceBand?: { low: number; high: number }; sampleProducts: string[];
};

export type Profile = { age: Record<string, number>; femaleSkew: number; taste: { id: string; name: string; type: string; affinity: number }[] };

export type Workspace = {
  id: string; name: string; store_url: string | null; store: StoreSummary | null;
  brand: { ids: string[]; name: string; category?: string; positioning?: string; match?: Entity | null; signals: Entity[] } | null;
  profile: Profile | null; created_at: string;
};

export type Kit = {
  creative?: { headline: string; subline: string; visual: string; music: string };
  poster?: { url: string; signals: string[] };
  track?: { url: string; signals: string[] };
  promo?: { day: string; title: string; detail: string; partner?: string }[];
};

export type Plan = {
  id: string; workspace_id: string; name: string; goal: string | null; city: string | null; timing: string | null; budget: string | null;
  status: string; scout: Scout | null; chosen_spot: string | null; kit: Kit; share_token: string; created_at: string; updated_at: string;
};

export type OutreachStatus = "to_contact" | "sent" | "replied" | "booked";
export type PartnerSnapshot = { id: string; name: string; kind: string; affinity?: number; why?: string; address?: string; website?: string; phone?: string; description?: string; audience?: string };
export type Outreach = { id: string; plan_id: string; partner: PartnerSnapshot; role: Role; subject: string | null; body: string | null; status: OutreachStatus; updated_at: string };
