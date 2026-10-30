// Media prompts shared by the app and the demo seed script.

type Creative = { headline: string; subline: string; visual: string; music: string };

export function posterPrompt(brand: string, spot: string, c: Creative) {
  return `Editorial launch poster, portrait 3:4. Visual direction: ${c.visual}
The poster contains exactly three pieces of text, each rendered once, spelled exactly as given:
1. Headline: "${c.headline}"
2. Subline: "${c.subline}"
3. Small footer: "${brand} · Pop-up · ${spot}"
No other text. No logos, monograms, symbols or brand marks of any kind. No addresses, dates, prices, phone numbers or URLs.
Professional print design, crisp legible typography, generous whitespace.`;
}

export function trackPrompt(c: Creative) {
  return `Instrumental in-store background track, 30 seconds, loopable. ${c.music}`;
}
