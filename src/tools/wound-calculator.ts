import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { calculateWounds, parseDamage } from "../lib/wound-calc.js";

export function registerWoundCalculator(server: McpServer): void {
  server.tool(
    "wound_calculator",
    "Calculate expected wounds and damage for a Warhammer 40,000 attack sequence. Pure math — input an attack profile and target stats, get probabilities and expected results for hits, wounds, saves, and damage.",
    {
      attacks: z.number().min(1).describe("Number of attacks"),
      hit_skill: z
        .number()
        .min(2)
        .max(6)
        .describe(
          "Ballistic Skill or Weapon Skill needed (e.g., 3 for 3+)",
        ),
      strength: z.number().min(1).describe("Weapon strength"),
      toughness: z.number().min(1).describe("Target toughness"),
      armour_save: z
        .number()
        .min(2)
        .max(7)
        .describe("Target's armour save (e.g., 3 for 3+, 7 for no save)"),
      damage: z
        .string()
        .describe("Damage value (e.g., '1', '2', 'D3', 'D6', 'D6+1', '2D6')"),
      armour_penetration: z
        .number()
        .min(0)
        .max(6)
        .optional()
        .default(0)
        .describe("AP value as a positive number (e.g., 2 for AP-2)"),
      invulnerable_save: z
        .number()
        .min(2)
        .max(6)
        .optional()
        .describe("Invulnerable save (e.g., 4 for 4++)"),
      feel_no_pain: z
        .number()
        .min(2)
        .max(6)
        .optional()
        .describe("Feel No Pain value (e.g., 5 for 5+++)"),
      reroll_hits: z
        .enum(["ones", "all"])
        .optional()
        .describe("Re-roll hit rolls: 'ones' = re-roll 1s, 'all' = re-roll all misses"),
      reroll_wounds: z
        .enum(["ones", "all"])
        .optional()
        .describe("Re-roll wound rolls: 'ones' = re-roll 1s, 'all' = re-roll all misses"),
      weapon_keywords: z
        .array(z.string())
        .optional()
        .describe(
          "Weapon keywords that affect the calculation (e.g., ['Lethal Hits', 'Sustained Hits 1', 'Devastating Wounds', 'Torrent', 'Twin-linked'])",
        ),
      wounds_per_model: z
        .number()
        .min(1)
        .optional()
        .describe("Wounds characteristic of each target model (for models killed estimate)"),
      game_mode: z
        .enum(["40k", "combat_patrol", "kill_team"])
        .optional()
        .default("40k")
        .describe("Game mode (currently only 40k wound math is supported)"),
    },
    async (args) => {
      if (args.game_mode === "kill_team") {
        return {
          content: [
            {
              type: "text" as const,
              text: "Kill Team uses a different wound/defence system (attack dice vs defence dice). This calculator currently supports Warhammer 40,000 only.",
            },
          ],
        };
      }

      const result = calculateWounds({
        attacks: args.attacks,
        hitSkill: args.hit_skill,
        strength: args.strength,
        toughness: args.toughness,
        armourSave: args.armour_save,
        armourPenetration: args.armour_penetration,
        damage: args.damage,
        invulnerableSave: args.invulnerable_save,
        feelNoPain: args.feel_no_pain,
        rerollHits: args.reroll_hits,
        rerollWounds: args.reroll_wounds,
        weaponKeywords: args.weapon_keywords,
        woundsPerModel: args.wounds_per_model,
      });

      const text = formatResult(args, result);
      return {
        content: [{ type: "text" as const, text }],
      };
    },
  );
}

function formatResult(
  args: {
    attacks: number;
    hit_skill: number;
    strength: number;
    toughness: number;
    armour_save: number;
    armour_penetration?: number;
    damage: string;
    invulnerable_save?: number;
    feel_no_pain?: number;
    reroll_hits?: "ones" | "all";
    reroll_wounds?: "ones" | "all";
    weapon_keywords?: string[];
    wounds_per_model?: number;
  },
  r: ReturnType<typeof calculateWounds>,
): string {
  const ap = args.armour_penetration ?? 0;
  const modifiedSave = args.armour_save + ap;
  const effectiveSave =
    args.invulnerable_save !== undefined
      ? Math.min(modifiedSave, args.invulnerable_save)
      : modifiedSave;
  const effectiveSaveStr =
    effectiveSave > 6 ? "none (auto-fail)" : `${effectiveSave}+`;

  const isTorrent = (args.weapon_keywords ?? []).some(
    (kw) => kw.toLowerCase() === "torrent",
  );

  // Attack profile line
  const hitStr = isTorrent ? "auto-hit" : `BS/WS ${args.hit_skill}+`;
  const apStr = ap > 0 ? ` AP-${ap}` : " AP0";
  const profileLine = `${args.attacks} attacks | ${hitStr} | S${args.strength}${apStr} D${args.damage}`;

  // Target line
  let targetLine = `vs T${args.toughness} Sv${args.armour_save}+`;
  if (ap > 0 && modifiedSave <= 6) {
    targetLine += ` (modified to ${modifiedSave}+)`;
  } else if (ap > 0) {
    targetLine += ` (modified to auto-fail)`;
  }
  if (args.invulnerable_save !== undefined) {
    targetLine += ` | ${args.invulnerable_save}++ invuln`;
  }
  if (args.feel_no_pain !== undefined) {
    targetLine += ` | ${args.feel_no_pain}+++ FNP`;
  }
  if (args.wounds_per_model !== undefined) {
    targetLine += ` | ${args.wounds_per_model}W per model`;
  }

  // Results table
  const pctHit = (r.hitProbability * 100).toFixed(1);
  const pctWound = (r.woundProbability * 100).toFixed(1);
  const pctSaveFail = (r.saveProbability * 100).toFixed(1);

  const rows = [
    `| Hits | ${r.expectedHits.toFixed(2)} | ${pctHit}% |`,
    `| Wounds | ${r.expectedWounds.toFixed(2)} | ${pctWound}% |`,
    `| Unsaved wounds | ${r.expectedUnsaved.toFixed(2)} | ${pctSaveFail}% |`,
    `| Damage dealt | ${r.expectedDamage.toFixed(2)} | — |`,
  ];

  if (r.expectedModelsKilled !== null) {
    rows.push(`| Models killed | ~${r.expectedModelsKilled} | — |`);
  }

  // Key Interactions
  const interactions: string[] = [];

  if (ap > 0) {
    if (
      args.invulnerable_save !== undefined &&
      args.invulnerable_save < modifiedSave
    ) {
      interactions.push(
        `AP-${ap} modifies ${args.armour_save}+ save to ${modifiedSave > 6 ? "auto-fail" : `${modifiedSave}+`}, but ${args.invulnerable_save}++ invulnerable save is better (effective save: ${effectiveSaveStr})`,
      );
    } else {
      interactions.push(
        `AP-${ap} modifies ${args.armour_save}+ save to ${modifiedSave > 6 ? "auto-fail" : `${modifiedSave}+`}`,
      );
    }
  } else if (args.invulnerable_save !== undefined) {
    if (args.invulnerable_save < args.armour_save) {
      interactions.push(
        `${args.invulnerable_save}++ invulnerable save is better than ${args.armour_save}+ armour save`,
      );
    } else {
      interactions.push(
        `Armour save (${args.armour_save}+) is better than or equal to invulnerable save (${args.invulnerable_save}++)`,
      );
    }
  } else {
    interactions.push("No invulnerable save applies");
  }

  if (isTorrent) {
    interactions.push("Torrent: all attacks auto-hit (no hit roll)");
  }

  const keywords = args.weapon_keywords ?? [];
  for (const kw of keywords) {
    const sustained = kw.match(/sustained\s+hits?\s+(\d+)/i);
    if (sustained) {
      interactions.push(
        `Sustained Hits ${sustained[1]}: unmodified 6s to hit generate ${sustained[1]} extra hit(s)`,
      );
    }
    if (kw.toLowerCase() === "lethal hits") {
      interactions.push(
        "Lethal Hits: unmodified 6s to hit auto-wound (skip wound roll)",
      );
    }
    if (kw.toLowerCase() === "devastating wounds") {
      interactions.push(
        `Devastating Wounds: unmodified 6s to wound become mortal wounds (~${r.mortalWoundDamage.toFixed(2)} mortal wound damage)`,
      );
    }
    if (kw.toLowerCase() === "twin-linked") {
      interactions.push("Twin-linked: re-roll all failed wound rolls");
    }
  }

  if (args.reroll_hits) {
    interactions.push(
      `Re-roll ${args.reroll_hits === "ones" ? "hit rolls of 1" : "all failed hit rolls"}`,
    );
  }
  if (args.reroll_wounds) {
    interactions.push(
      `Re-roll ${args.reroll_wounds === "ones" ? "wound rolls of 1" : "all failed wound rolls"}`,
    );
  }
  if (args.feel_no_pain !== undefined) {
    const fnpPassPct = (((7 - args.feel_no_pain) / 6) * 100).toFixed(1);
    interactions.push(
      `Feel No Pain ${args.feel_no_pain}+++ ignores ${fnpPassPct}% of damage`,
    );
  }

  const avgDmg = parseDamage(args.damage);
  if (avgDmg !== parseInt(args.damage, 10)) {
    interactions.push(
      `Variable damage ${args.damage} averages ${avgDmg.toFixed(1)} per wound`,
    );
  }

  const lines = [
    `# Wound Calculator — Warhammer 40,000`,
    ``,
    `## Attack Profile`,
    profileLine,
    targetLine,
    ``,
    `## Results`,
    `| Step | Expected | Per-attack % |`,
    `|------|----------|-------------|`,
    ...rows,
    ``,
    `## Key Interactions`,
    ...interactions.map((i) => `- ${i}`),
  ];

  return lines.join("\n");
}
