// Scout agent definition: system prompt and tool schemas. No runtime imports, so it loads in both Node and edge functions.

export type ScoutInput = {
  brandIds: string[];
  brandName: string;
  city: string;
  goal: string;
  timing?: string;
  budget?: string;
  audience?: string;
};

export const SCOUT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "map_taste",
        description: "Map where the brand's taste lives across the target city using Qloo's taste heatmap. Returns ranked neighbourhoods and candidate spots labelled sweet (top-decile taste, outside the busiest decile) or prime (top decile on both).",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "scan_block",
        description: "Scan the blocks around one candidate spot for local partners that share the brand's audience (Qloo places with affinity and explainability). Use it to compare spots.",
        parameters: { type: "object", properties: { spot_id: { type: "string", description: "A spot id from map_taste" } }, required: ["spot_id"] },
      },
      {
        name: "find_collab_brands",
        description: "Find brands whose audiences overlap the brand's (Qloo brand affinity), as co-host or collab-drop candidates.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "find_launch_artists",
        description: "Find musicians the brand's audience in this city loves (Qloo artist affinity with a location signal), for launch night and in-store music direction.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "submit_plan",
        description: "Submit the final recommendation. Only use ids returned by earlier tools.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Two sentences for the founder: where and why, citing Qloo numbers." },
            spots: {
              type: "array",
              description: "Exactly 3 spots, best first.",
              items: {
                type: "object",
                properties: {
                  spot_id: { type: "string" },
                  headline: { type: "string", description: "At most 8 words." },
                  reasoning: { type: "string", description: "At most 25 words, cite affinity, busy percentile and partner counts." },
                },
                required: ["spot_id", "headline", "reasoning"],
              },
            },
            partners: {
              type: "array",
              description: "6 to 10 partners for the top spot across roles.",
              items: {
                type: "object",
                properties: {
                  entity_id: { type: "string" },
                  role: { type: "string", enum: ["host", "copromote", "guests", "collab", "launch"] },
                  why: { type: "string", description: "At most 18 words, specific to the shared audience." },
                },
                required: ["entity_id", "role", "why"],
              },
            },
          },
          required: ["summary", "spots", "partners"],
        },
      },
    ],
  },
];

export function scoutSystem(input: ScoutInput) {
  return `You are Relocates Scout, an agent that helps an online brand open a physical presence: where to open, and who locally to partner with.
Brand: ${input.brandName}. City: ${input.city}. Goal: ${input.goal}. Timing: ${input.timing || "flexible"}. Budget: ${input.budget || "unspecified"}.
${input.audience ? `Audience per Qloo: ${input.audience}.` : ""}
Rules:
- Ground every decision in tool results. Never invent places, partners, ids or numbers.
- Work in this order: map_taste; then scan_block on the 3 most promising spots (include at least one sweet spot and, if present, one prime spot) in the same turn; then find_collab_brands and find_launch_artists together; then submit_plan.
- Prefer sweet spots for pop-ups and tighter budgets (the brand's crowd, without the busiest-street premium). Prime spots fit flagship goals with larger budgets.
- Rank spots on taste affinity, how many strong partners surround them (venues with event space matter most for launches), and goal fit.
- Refer to spots by neighbourhood name in all text; never show spot ids to the founder.
- Partners: pick venues with event space as hosts, cafés/restaurants for co-promotion, hotels for guest traffic, brands as collabs, artists for launch night.`;
}
