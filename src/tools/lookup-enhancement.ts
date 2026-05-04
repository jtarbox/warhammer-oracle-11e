import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENHANCEMENTS } from "../data/enhancements.js";
import { fuzzySearch } from "../lib/search.js";
import type { Enhancement } from "../types.js";

function formatEnhancement(enh: Enhancement): string {
  const sections: string[] = [];

  const ptsStr = enh.points !== null ? `${enh.points} pts` : "?? pts";
  sections.push(
    `# ${enh.name}\n\n**Game:** Warhammer 40,000 | **Faction:** ${enh.faction} | **Detachment:** ${enh.detachment} | **Cost:** ${ptsStr}`,
  );

  sections.push(`### Effect\n\n${enh.description}`);

  return sections.join("\n\n");
}

export function registerLookupEnhancement(server: McpServer): void {
  server.tool(
    "lookup_enhancement",
    "Look up a Warhammer 40,000 enhancement by name. Returns the points cost, detachment, and effect.",
    {
      name: z.string().describe("Name or partial name of the enhancement to look up"),
      faction: z
        .string()
        .optional()
        .describe("Optional faction filter (e.g. 'Space Marines', 'Aeldari')"),
      detachment: z
        .string()
        .optional()
        .describe("Optional detachment filter (e.g. 'Gladius Task Force')"),
    },
    async ({ name, faction, detachment }) => {
      let candidates: Enhancement[] = [...ENHANCEMENTS];

      if (faction) {
        candidates = fuzzySearch(candidates, faction, ["faction"]);
      }
      if (detachment) {
        candidates = fuzzySearch(candidates, detachment, ["detachment"]);
      }

      const matches = fuzzySearch(candidates, name, ["name"]);

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No enhancement found matching "${name}".${faction ? ` (faction: "${faction}")` : ""}${detachment ? ` (detachment: "${detachment}")` : ""}\n\nTry a partial name or check the faction/detachment spelling.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatEnhancement(matches[0]),
          },
        ],
      };
    },
  );
}
