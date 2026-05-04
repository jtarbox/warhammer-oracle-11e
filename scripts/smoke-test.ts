/**
 * End-to-end smoke test: spawns the actual MCP server and calls every tool
 * with realistic queries, printing results for visual inspection.
 *
 * Usage: npx tsx scripts/smoke-test.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";

const SERVER_PATH = resolve(import.meta.dirname!, "../dist/index.js");

async function main() {
  console.log("Spawning MCP server from dist/index.js...\n");

  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
  });

  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`✓ Server started — ${tools.length} tools registered:\n`);
  for (const t of tools) {
    console.log(`  • ${t.name}`);
  }
  console.log("");

  let passed = 0;
  let failed = 0;

  async function test(
    label: string,
    toolName: string,
    args: Record<string, unknown>,
    checks: (text: string) => string[],
  ) {
    try {
      const result = await client.callTool({ name: toolName, arguments: args });
      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      const failures = checks(text);
      if (failures.length > 0) {
        console.log(`✗ ${label}`);
        for (const f of failures) console.log(`    FAIL: ${f}`);
        console.log(`    Output (first 200 chars): ${text.slice(0, 200)}\n`);
        failed++;
      } else {
        console.log(`✓ ${label}`);
        passed++;
      }
    } catch (err: any) {
      console.log(`✗ ${label} — ERROR: ${err.message}\n`);
      failed++;
    }
  }

  // === Existing tools (regression checks) ===

  await test("lookup_unit: Space Marines unit", "lookup_unit", { unit_name: "Tactical Squad", faction: "Space Marines" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Tactical Squad")) f.push("missing unit name");
    if (!t.includes("Boltgun") && !t.includes("Bolt")) f.push("missing weapon");
    if (!t.includes("pts")) f.push("missing points");
    return f;
  });

  await test("lookup_unit: Kill Team operative", "lookup_unit", { unit_name: "Legionary Warrior", game_mode: "kill_team" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Kill Team")) f.push("missing Kill Team label");
    if (!t.includes("APL")) f.push("missing APL stat");
    return f;
  });

  await test("search_units: Necrons", "search_units", { query: "warrior", faction: "Necrons" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Necron")) f.push("missing Necron results");
    return f;
  });

  await test("compare_units: two units", "compare_units", { units: ["Intercessors", "Tactical Squad"] }, (t) => {
    const f: string[] = [];
    if (!t.includes("Unit Profiles")) f.push("missing profiles section");
    if (!t.includes("---")) f.push("missing separator between units");
    return f;
  });

  await test("lookup_keyword: Devastating Wounds", "lookup_keyword", { keyword: "Devastating Wounds" }, (t) => {
    const f: string[] = [];
    if (!t.includes("mortal wound")) f.push("missing mortal wound explanation");
    if (!t.includes("Plain English")) f.push("missing plain English section");
    return f;
  });

  await test("lookup_phase: Shooting", "lookup_phase", { phase_name: "Shooting" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Shooting")) f.push("missing phase name");
    if (!t.includes("1.") || !t.includes("2.")) f.push("missing numbered steps");
    return f;
  });

  await test("game_flow: full overview", "game_flow", {}, (t) => {
    const f: string[] = [];
    if (!t.includes("Command")) f.push("missing Command phase");
    if (!t.includes("Fight")) f.push("missing Fight phase");
    return f;
  });

  // === New tools ===

  await test("lookup_stratagem: Command Re-roll", "lookup_stratagem", { name: "Command Re-roll" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Command Re-roll")) f.push("missing stratagem name");
    if (!t.includes("Warhammer 40,000")) f.push("CRITICAL: missing game mode label");
    if (!t.includes("CP")) f.push("missing CP cost");
    if (!t.includes("Re-roll")) f.push("missing effect text");
    return f;
  });

  await test("lookup_stratagem: Fire Overwatch", "lookup_stratagem", { name: "Fire Overwatch" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Fire Overwatch")) f.push("missing stratagem name");
    if (!t.includes("Warhammer 40,000")) f.push("CRITICAL: missing game mode label");
    if (!t.includes("6s")) f.push("missing hitting on 6s detail");
    return f;
  });

  await test("lookup_stratagem: faction-specific", "lookup_stratagem", { name: "Honour the Chapter", faction: "Adeptus Astartes" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Gladius Task Force") && !t.includes("Adeptus Astartes")) f.push("missing faction/detachment info");
    return f;
  });

  await test("lookup_stratagem: not found suggests ploy", "lookup_stratagem", { name: "totally_fake_thing" }, (t) => {
    const f: string[] = [];
    if (!t.includes("lookup_ploy")) f.push("CRITICAL: not suggesting lookup_ploy for KT");
    return f;
  });

  await test("search_stratagems: fight phase", "search_stratagems", { query: "fight", phase: "Fight" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Warhammer 40,000")) f.push("CRITICAL: missing game mode label");
    if (!t.includes("Counter-operative") && !t.includes("Epic Challenge") && !t.includes("Fight")) f.push("missing fight phase stratagems");
    return f;
  });

  await test("lookup_detachment: Gladius Task Force", "lookup_detachment", { name: "Gladius Task Force" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Gladius Task Force")) f.push("missing detachment name");
    if (!t.includes("Warhammer 40,000")) f.push("CRITICAL: missing game mode label");
    if (!t.includes("Detachment Ability")) f.push("missing ability section");
    if (!t.includes("Enhancements")) f.push("missing enhancements section");
    return f;
  });

  await test("lookup_detachment: Aeldari Warhost", "lookup_detachment", { name: "Warhost", faction: "Aeldari" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Aeldari")) f.push("missing faction");
    if (!t.includes("Detachment Ability")) f.push("missing ability");
    return f;
  });

  await test("lookup_enhancement: by name", "lookup_enhancement", { name: "Guiding Presence" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Guiding Presence")) f.push("missing enhancement name");
    if (!t.includes("Warhammer 40,000")) f.push("CRITICAL: missing game mode label");
    if (!t.includes("pts")) f.push("missing points cost");
    if (!t.includes("Effect")) f.push("missing effect section");
    return f;
  });

  await test("lookup_enhancement: with faction filter", "lookup_enhancement", { name: "Guiding Presence", faction: "Aeldari" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Aeldari")) f.push("missing faction");
    if (!t.includes("Armoured Warhost")) f.push("missing detachment association");
    return f;
  });

  await test("lookup_ploy: Bolster (universal)", "lookup_ploy", { name: "Bolster" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Bolster")) f.push("missing ploy name");
    if (!t.includes("Kill Team")) f.push("CRITICAL: missing Kill Team game mode label");
    if (!t.includes("strategic ploy")) f.push("missing ploy type");
    if (!t.includes("invulnerable save") && !t.includes("4+")) f.push("missing effect detail");
    return f;
  });

  await test("lookup_ploy: faction-specific", "lookup_ploy", { name: "Hateful Assault", faction: "Legionaries" }, (t) => {
    const f: string[] = [];
    if (!t.includes("Kill Team")) f.push("CRITICAL: missing Kill Team label");
    if (!t.includes("Legionaries")) f.push("missing faction");
    return f;
  });

  await test("lookup_ploy: not found suggests stratagem", "lookup_ploy", { name: "totally_fake_thing" }, (t) => {
    const f: string[] = [];
    if (!t.includes("lookup_stratagem")) f.push("CRITICAL: not suggesting lookup_stratagem for 40K");
    return f;
  });

  await test("wound_calculator: basic attack", "wound_calculator", {
    attacks: 10, hit_skill: 3, strength: 5, toughness: 4,
    armour_save: 3, armour_penetration: 1, damage: "2", wounds_per_model: 2,
  }, (t) => {
    const f: string[] = [];
    if (!t.includes("Wound Calculator")) f.push("missing header");
    if (!t.includes("Hits")) f.push("missing hits row");
    if (!t.includes("Wounds")) f.push("missing wounds row");
    if (!t.includes("Damage")) f.push("missing damage output");
    if (!t.includes("Models killed")) f.push("missing models killed");
    if (!t.includes("AP-1")) f.push("missing AP interaction note");
    return f;
  });

  await test("wound_calculator: Devastating Wounds", "wound_calculator", {
    attacks: 10, hit_skill: 3, strength: 6, toughness: 4,
    armour_save: 2, damage: "3",
    weapon_keywords: ["Devastating Wounds"],
  }, (t) => {
    const f: string[] = [];
    if (!t.includes("Devastating Wounds")) f.push("missing Dev Wounds in interactions");
    if (!t.includes("mortal")) f.push("missing mortal wound explanation");
    return f;
  });

  await test("wound_calculator: Torrent (auto-hit)", "wound_calculator", {
    attacks: 6, hit_skill: 4, strength: 4, toughness: 4,
    armour_save: 3, damage: "1",
    weapon_keywords: ["Torrent"],
  }, (t) => {
    const f: string[] = [];
    if (!t.includes("Torrent") && !t.includes("auto-hit")) f.push("missing Torrent note");
    return f;
  });

  // === Summary ===

  console.log(`\n${"═".repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log(`${"═".repeat(50)}\n`);

  await client.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
