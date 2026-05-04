import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DETACHMENTS } from "../data/detachments.js";
import { ENHANCEMENTS } from "../data/enhancements.js";
import { STRATAGEMS } from "../data/stratagems.js";
import { fuzzySearch } from "../lib/search.js";
import type { Detachment, Enhancement, Stratagem } from "../types.js";

function formatDetachment(
  det: Detachment,
  enhancements: Enhancement[],
  stratagems: Stratagem[],
): string {
  const sections: string[] = [];

  sections.push(`# ${det.name}\n\n**Game:** Warhammer 40,000 | **Faction:** ${det.faction}`);

  sections.push(`### Detachment Ability: ${det.ability.name}\n\n${det.ability.description}`);

  if (enhancements.length > 0) {
    const enhLines = enhancements.map(
      (e) => `- **${e.name}** (${e.points ?? "??"} pts) — ${e.description}`,
    );
    sections.push(`### Enhancements\n\n${enhLines.join("\n")}`);
  }

  if (stratagems.length > 0) {
    const stratLines = stratagems.map(
      (s) => `- **${s.name}** (${s.cpCost} CP, ${s.phase}) — ${s.effect}`,
    );
    sections.push(`### Stratagems\n\n${stratLines.join("\n")}`);
  }

  return sections.join("\n\n");
}


export function registerLookupDetachment(server: McpServer): void {
  server.tool(
    "lookup_detachment",
    "Look up a Warhammer 40,000 detachment by name. Returns the detachment ability, available enhancements, and associated stratagems.",
    {
      name: z.string().describe("Name or partial name of the detachment to look up"),
      faction: z
        .string()
        .optional()
        .describe("Optional faction filter (e.g. 'Space Marines', 'Necrons')"),
    },
    async ({ name, faction }) => {
      let candidates: Detachment[] = [...DETACHMENTS];

      if (faction) {
        candidates = fuzzySearch(candidates, faction, ["faction"]);
      }

      const matches = fuzzySearch(candidates, name, ["name"]);

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No detachment found matching "${name}".${faction ? ` (faction: "${faction}")` : ""}\n\nTry a partial name or check the faction spelling.`,
            },
          ],
        };
      }

      const det = matches[0];

      const relatedEnhancements = ENHANCEMENTS.filter(
        (e) =>
          e.faction === det.faction &&
          e.detachment.toLowerCase() === det.name.toLowerCase(),
      );

      const relatedStratagems = STRATAGEMS.filter(
        (s) =>
          s.detachment !== null &&
          s.detachment.toLowerCase() === det.name.toLowerCase(),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: formatDetachment(det, relatedEnhancements, relatedStratagems),
          },
        ],
      };
    },
  );
}
