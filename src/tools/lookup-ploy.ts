import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PLOYS } from "../data/ploys.js";
import { fuzzySearch } from "../lib/search.js";
import type { Ploy } from "../types.js";

function formatPloy(ploy: Ploy): string {
  const sections: string[] = [];

  sections.push(
    `# ${ploy.name}\n\n**Game:** Kill Team | **Type:** ${ploy.type} ploy | **CP:** ${ploy.cpCost}`,
  );

  if (ploy.faction !== "Universal") {
    sections.push(`**Faction:** ${ploy.faction}`);
  }

  sections.push(`**When:** ${ploy.when}`);
  sections.push(`**Effect:** ${ploy.effect}`);

  if (ploy.restrictions) {
    sections.push(`**Restrictions:** ${ploy.restrictions}`);
  }

  return sections.join("\n\n");
}

export function registerLookupPloy(server: McpServer): void {
  server.tool(
    "lookup_ploy",
    "Look up a Kill Team ploy by name. Returns type (strategic/tactical), CP cost, timing, and effect. This is the Kill Team equivalent of stratagems — for Warhammer 40,000 stratagems, use lookup_stratagem instead.",
    {
      name: z.string().describe("Name or partial name of the ploy to look up"),
      faction: z
        .string()
        .optional()
        .describe("Optional faction filter (e.g. 'Universal', 'Legionaries', 'Kommandos')"),
      type: z
        .enum(["strategic", "tactical"])
        .optional()
        .describe("Optional ploy type filter"),
    },
    async ({ name, faction, type }) => {
      let candidates: Ploy[] = [...PLOYS];

      if (faction) {
        candidates = fuzzySearch(candidates, faction, ["faction"]);
      }
      if (type) {
        candidates = candidates.filter((p) => p.type === type);
      }

      const matches = fuzzySearch(candidates, name, ["name"]);

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No Kill Team ploy found matching "${name}".${faction ? ` (faction: "${faction}")` : ""}${type ? ` (type: "${type}")` : ""}\n\nNote: For Warhammer 40,000 stratagems, use the lookup_stratagem tool instead.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatPloy(matches[0]),
          },
        ],
      };
    },
  );
}
