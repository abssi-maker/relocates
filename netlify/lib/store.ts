// Reads a public storefront. Shopify stores expose /products.json; other sites fall back to page metadata.

export type StoreSummary = {
  domain: string;
  platform: "shopify" | "website";
  title?: string;
  description?: string;
  productCount: number;
  categories: string[];
  vendors: string[];
  tags: string[];
  priceBand?: { low: number; high: number; currency?: string };
  sampleProducts: string[];
};

const UA = "Mozilla/5.0 (compatible; RelocatesBot/1.0; +https://relocates.io)";

export function normalizeDomain(input: string) {
  const s = input.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) throw new Error("Enter a store address like yourbrand.com");
  return s;
}

export async function readStore(input: string): Promise<StoreSummary> {
  const domain = normalizeDomain(input);
  const meta = await readMeta(domain).catch(() => ({} as { title?: string; description?: string }));
  try {
    const res = await fetch(`https://${domain}/products.json?limit=250`, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(6000) });
    if (res.ok && res.headers.get("content-type")?.includes("json")) {
      const { products = [] } = await res.json();
      if (products.length) return summarizeShopify(domain, products, meta);
    }
  } catch {
    // fall through to metadata only
  }
  if (!meta.title && !meta.description) throw new Error(`Couldn't read ${domain}. Check the address, or try your Shopify store URL.`);
  return { domain, platform: "website", ...meta, productCount: 0, categories: [], vendors: [], tags: [], sampleProducts: [] };
}

async function readMeta(domain: string) {
  const res = await fetch(`https://${domain}/`, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(6000) });
  const html = (await res.text()).slice(0, 200_000);
  const pick = (re: RegExp) => html.match(re)?.[1]?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
  return {
    title: pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) || pick(/<title[^>]*>([^<]+)</i),
    description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i),
  };
}

function summarizeShopify(domain: string, products: any[], meta: { title?: string; description?: string }): StoreSummary {
  const count = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) if (x) m.set(x, (m.get(x) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  const tagList = products.flatMap((p) => (Array.isArray(p.tags) ? p.tags : String(p.tags || "").split(",")).map((t: string) => t.trim()));
  // Drop operational tags (SKUs, dates, flags) and keep human words.
  const tags = count(tagList.filter((t) => /^[A-Za-z][A-Za-z &'-]{2,24}$/.test(t) && !/sale|final|discount|hidden|exclude|eligible|ineligible|gift ?card|bundle/i.test(t)));
  const prices = products
    .flatMap((p) => (p.variants || []).slice(0, 1).map((v: any) => Number(v.price)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const q = (f: number) => prices[Math.min(prices.length - 1, Math.floor(f * prices.length))];
  return {
    domain,
    platform: "shopify",
    ...meta,
    productCount: products.length,
    categories: count(products.map((p) => String(p.product_type || "").trim())).slice(0, 6),
    vendors: count(products.map((p) => String(p.vendor || "").trim())).slice(0, 5),
    tags: tags.slice(0, 15),
    priceBand: prices.length ? { low: Math.round(q(0.1)), high: Math.round(q(0.9)) } : undefined,
    sampleProducts: products.slice(0, 12).map((p) => p.title),
  };
}
