import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { STRATAGEMS } from "../data/stratagems.js";
import { fuzzySearch } from "../lib/search.js";
import type { Stratagem } from "../types.js";

function formatStratagem(strat: Stratagem): string {
  const sections: string[] = [];

  sections.push(
    `# ${strat.name}\n\n**Game:** Warhammer 40,000 | **Type:** ${strat.type.replace("_", " ")} | **CP:** ${strat.cpCost}`,
  );

  if (strat.faction !== "Core") {
    sections.push(`**Faction:** ${strat.faction} | **Detachment:** ${strat.detachment ?? "—"}`);
  }

  sections.push(`**Phase:** ${strat.phase}`);
  sections.push(`**When:** ${strat.when}`);
  sections.push(`**Target:** ${strat.target}`);
  sections.push(`**Effect:** ${strat.effect}`);

  if (strat.restrictions) {
    sections.push(`**Restrictions:** ${strat.restrictions}`);
  }

  return sections.join("\n\n");
}

export function registerLookupStratagem(server: McpServer): void {
  server.tool(
    "lookup_stratagem",
    "Look up a Warhammer 40,000 stratagem by name. Returns CP cost, phase, timing, target, and effect. For Kill Team ploys, use lookup_ploy instead.",
    {
      name: z.string().describe("Name or partial name of the stratagem to look up"),
      faction: z
        .string()
        .optional()
        .describe("Optional faction filter (e.g. 'Core', 'Adeptus Astartes')"),
      phase: z
        .string()
        .optional()
        .describe("Optional phase filter (e.g. 'Fight phase', 'Shooting')"),
      detachment: z
        .string()
        .optional()
        .describe("Optional detachment filter (e.g. 'Gladius Task Force')"),
    },
    async ({ name, faction, phase, detachment }) => {
      let candidates: Stratagem[] = [...STRATAGEMS];

      if (faction) {
        candidates = fuzzySearch(candidates, faction, ["faction"]);
      }
      if (phase) {
        candidates = fuzzySearch(candidates, phase, ["phase"]);
      }
      if (detachment) {
        candidates = candidates.filter(
          (s) => s.detachment && s.detachment.toLowerCase().includes(detachment.toLowerCase()),
        );
      }

      const matches = fuzzySearch(candidates, name, ["name"]);

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No Warhammer 40,000 stratagem found matching "${name}".${faction ? ` (faction: "${faction}")` : ""}${phase ? ` (phase: "${phase}")` : ""}\n\nNote: For Kill Team ploys, use the lookup_ploy tool instead.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatStratagem(matches[0]),
          },
        ],
      };
    },
  );
}
