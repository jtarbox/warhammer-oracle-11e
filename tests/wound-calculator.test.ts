import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import {
  calculateWounds,
  parseDamage,
  type WoundCalcInput,
} from "../src/lib/wound-calc.js";

// ─── Math engine unit tests ────────────────────────────────────────────

describe("parseDamage", () => {
  it("parses fixed numbers", () => {
    expect(parseDamage("1")).toBe(1);
    expect(parseDamage("2")).toBe(2);
    expect(parseDamage("3")).toBe(3);
  });

  it("parses D3", () => {
    expect(parseDamage("D3")).toBe(2);
  });

  it("parses D6", () => {
    expect(parseDamage("D6")).toBe(3.5);
  });

  it("parses D6+1", () => {
    expect(parseDamage("D6+1")).toBe(4.5);
  });

  it("parses D3+1", () => {
    expect(parseDamage("D3+1")).toBe(3);
  });

  it("parses 2D6", () => {
    expect(parseDamage("2D6")).toBe(7);
  });

  it("parses case-insensitively", () => {
    expect(parseDamage("d6")).toBe(3.5);
    expect(parseDamage("d3+1")).toBe(3);
  });

  it("throws on invalid input", () => {
    expect(() => parseDamage("abc")).toThrow();
  });
});

describe("calculateWounds — math engine", () => {
  // Helper for common defaults
  function calc(overrides: Partial<WoundCalcInput>): ReturnType<typeof calculateWounds> {
    return calculateWounds({
      attacks: 10,
      hitSkill: 3,
      strength: 4,
      toughness: 4,
      armourSave: 3,
      damage: "1",
      ...overrides,
    });
  }

  // ─── Scenario 1: Basic case ───────────────────────────────────
  it("basic case: 10 attacks BS3+ S4 T4 Sv3+ AP0 D1", () => {
    const r = calc({});
    // Hits: 10 * 4/6 = 6.67
    expect(r.expectedHits).toBeCloseTo(6.67, 1);
    // Wounds: S=T so 4+ → 6.67 * 3/6 = 3.33
    expect(r.expectedWounds).toBeCloseTo(3.33, 1);
    // Saves: 3+ unmodified → pass on 3+ = 4/6, fail = 2/6
    // Unsaved: 3.33 * 2/6 = 1.11
    expect(r.expectedUnsaved).toBeCloseTo(1.11, 1);
    // Damage: 1.11 * 1 = 1.11
    expect(r.expectedDamage).toBeCloseTo(1.11, 1);
    expect(r.mortalWoundDamage).toBe(0);
  });

  // ─── Scenario 2: AP modifying save ────────────────────────────
  it("AP-2 modifies save: more damage gets through", () => {
    const r = calc({ armourPenetration: 2 });
    // Modified save = 3 + 2 = 5+, fail prob = 4/6
    // Unsaved: 3.33 * 4/6 = 2.22
    expect(r.expectedUnsaved).toBeCloseTo(2.22, 1);
    expect(r.saveProbability).toBeCloseTo(4 / 6, 2);
  });

  // ─── Scenario 3: Invuln better than modified save ─────────────
  it("invuln beats modified save: AP-4 vs 3+ Sv with 4++ invuln", () => {
    const r = calc({ armourPenetration: 4, invulnerableSave: 4 });
    // Modified armour = 3 + 4 = 7 (auto-fail)
    // But invuln 4+ means effective save = 4+
    // Fail prob = 3/6 = 0.5
    expect(r.saveProbability).toBeCloseTo(0.5, 2);
    // Unsaved: 3.33 * 0.5 = 1.67
    expect(r.expectedUnsaved).toBeCloseTo(1.67, 1);
  });

  // ─── Scenario 4: Torrent ──────────────────────────────────────
  it("Torrent: auto-hits regardless of BS", () => {
    const r = calc({ hitSkill: 6, weaponKeywords: ["Torrent"] });
    // All 10 attacks auto-hit
    expect(r.expectedHits).toBe(10);
    expect(r.hitProbability).toBe(1);
  });

  // ─── Scenario 5: Devastating Wounds ───────────────────────────
  it("Devastating Wounds: some wound damage bypasses saves", () => {
    const r = calc({ weaponKeywords: ["Devastating Wounds"] });
    // 6.67 hits, wound on 4+ = 3.33 wounds
    // 1/6 of wound rolls are natural 6s = ~0.56 devastating wounds
    // These bypass saves entirely
    expect(r.mortalWoundDamage).toBeGreaterThan(0);
    // Total damage should be higher than without devastating wounds
    const rNormal = calc({});
    expect(r.expectedDamage).toBeGreaterThan(rNormal.expectedDamage);
  });

  // ─── Scenario 6: Sustained Hits 1 ────────────────────────────
  it("Sustained Hits 1: 6s to hit generate extra hits", () => {
    const r = calc({ weaponKeywords: ["Sustained Hits 1"] });
    const rNormal = calc({});
    // Should get more hits than normal (extra hits from natural 6s)
    expect(r.expectedHits).toBeGreaterThan(rNormal.expectedHits);
    // 10 * 1/6 = 1.67 extra hits, so ~8.33 total vs 6.67 normal
    expect(r.expectedHits).toBeCloseTo(8.33, 1);
  });

  // ─── Scenario 7: Lethal Hits ──────────────────────────────────
  it("Lethal Hits: 6s to hit auto-wound", () => {
    const r = calc({ weaponKeywords: ["Lethal Hits"] });
    const rNormal = calc({});
    // Lethal hits skip wound roll, so more total wounds
    expect(r.expectedWounds).toBeGreaterThan(rNormal.expectedWounds);
  });

  // ─── Scenario 8: Feel No Pain ─────────────────────────────────
  it("Feel No Pain 5+++ reduces final damage", () => {
    const r = calc({ feelNoPain: 5 });
    const rNormal = calc({});
    // FNP 5+: pass on 5+ = 2/6, fail = 4/6
    expect(r.fnpFailProbability).toBeCloseTo(4 / 6, 2);
    expect(r.expectedDamage).toBeCloseTo(rNormal.expectedDamage * (4 / 6), 1);
  });

  // ─── Scenario 9: Variable damage D6 ──────────────────────────
  it("D6 damage uses 3.5 average", () => {
    const r = calc({ damage: "D6" });
    const rD1 = calc({ damage: "1" });
    // Damage should be 3.5x the D1 result
    expect(r.expectedDamage).toBeCloseTo(rD1.expectedDamage * 3.5, 1);
  });

  // ─── Scenario 10: Re-roll all hits ───────────────────────────
  it("re-roll all hits significantly increases hit rate", () => {
    const r = calc({ rerollHits: "all" });
    const rNormal = calc({});
    expect(r.expectedHits).toBeGreaterThan(rNormal.expectedHits);
    // BS3+ = 4/6 base. Reroll all: p + (1-p)*p = 4/6 + 2/6 * 4/6 = 4/6 + 8/36 = 32/36 = 0.889
    expect(r.hitProbability).toBeCloseTo(32 / 36, 2);
  });

  // ─── Additional edge cases ────────────────────────────────────

  it("S >> T: wounds on 2+", () => {
    const r = calc({ strength: 10, toughness: 4 });
    expect(r.woundProbability).toBeCloseTo(5 / 6, 2);
  });

  it("S > T: wounds on 3+", () => {
    const r = calc({ strength: 5, toughness: 4 });
    expect(r.woundProbability).toBeCloseTo(4 / 6, 2);
  });

  it("S < T: wounds on 5+", () => {
    const r = calc({ strength: 3, toughness: 4 });
    expect(r.woundProbability).toBeCloseTo(2 / 6, 2);
  });

  it("S << T: wounds on 6+", () => {
    const r = calc({ strength: 2, toughness: 4 });
    expect(r.woundProbability).toBeCloseTo(1 / 6, 2);
  });

  it("re-roll wound rolls of 1", () => {
    const r = calc({ rerollWounds: "ones" });
    const rNormal = calc({});
    expect(r.expectedWounds).toBeGreaterThan(rNormal.expectedWounds);
  });

  it("Twin-linked acts as reroll all wounds", () => {
    const rTwinLinked = calc({ weaponKeywords: ["Twin-linked"] });
    const rRerollAll = calc({ rerollWounds: "all" });
    expect(rTwinLinked.expectedWounds).toBeCloseTo(
      rRerollAll.expectedWounds,
      2,
    );
  });

  it("armour save 7 means no save (auto-fail)", () => {
    const r = calc({ armourSave: 7 });
    // 7+ is impossible to pass
    expect(r.saveProbability).toBe(1);
  });

  it("AP that pushes save above 6 means auto-fail", () => {
    const r = calc({ armourSave: 4, armourPenetration: 4 });
    // 4 + 4 = 8+ is auto-fail
    expect(r.saveProbability).toBe(1);
  });

  it("models killed is null when woundsPerModel not provided", () => {
    const r = calc({});
    expect(r.expectedModelsKilled).toBeNull();
  });

  it("models killed calculation with D2 damage vs 1W models", () => {
    const r = calc({
      damage: "2",
      armourPenetration: 2,
      woundsPerModel: 1,
    });
    // Each unsaved wound deals 2 damage, but 1W models die per wound
    // So models killed = floor(totalDmg / 1)
    expect(r.expectedModelsKilled).toBeGreaterThan(0);
    expect(r.expectedModelsKilled).toBe(
      Math.floor(r.expectedDamage / 1),
    );
  });

  it("Sustained Hits 2 generates 2 extra hits per 6", () => {
    const r1 = calc({ weaponKeywords: ["Sustained Hits 1"] });
    const r2 = calc({ weaponKeywords: ["Sustained Hits 2"] });
    expect(r2.expectedHits).toBeGreaterThan(r1.expectedHits);
    // Difference should be ~10 * 1/6 = ~1.67 extra hits for Sustained 2 vs Sustained 1
    expect(r2.expectedHits - r1.expectedHits).toBeCloseTo(10 / 6, 1);
  });

  it("Torrent disables Sustained Hits and Lethal Hits", () => {
    const rTorrent = calc({
      weaponKeywords: ["Torrent", "Sustained Hits 1", "Lethal Hits"],
    });
    // With Torrent there's no hit roll, so no natural 6s to trigger Sustained/Lethal
    expect(rTorrent.expectedHits).toBe(10);
    // Wounds should be same as plain Torrent (no lethal hits benefit)
    const rTorrentPlain = calc({ weaponKeywords: ["Torrent"] });
    expect(rTorrent.expectedWounds).toBeCloseTo(
      rTorrentPlain.expectedWounds,
      2,
    );
  });

  it("re-roll hits 'ones' increases hit count", () => {
    const r = calc({ rerollHits: "ones" });
    // BS3+: base = 4/6. Reroll 1s: 4/6 + 1/6 * 4/6 = 4/6 + 4/36 = 28/36 = 7/9
    expect(r.hitProbability).toBeCloseTo(28 / 36, 3);
  });

  it("FNP 6+++ barely reduces damage", () => {
    const r = calc({ feelNoPain: 6 });
    // FNP 6+: pass on 6 = 1/6, fail = 5/6
    expect(r.fnpFailProbability).toBeCloseTo(5 / 6, 2);
  });

  it("FNP 2+++ massively reduces damage", () => {
    const r = calc({ feelNoPain: 2 });
    // FNP 2+: pass on 2+ = 5/6, fail = 1/6
    expect(r.fnpFailProbability).toBeCloseTo(1 / 6, 2);
    const rNormal = calc({});
    expect(r.expectedDamage).toBeCloseTo(rNormal.expectedDamage / 6, 1);
  });
});

// ─── MCP tool integration tests ──────────────────────────────────────

describe("wound_calculator MCP tool", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer();
    client = new Client({ name: "test-client", version: "1.0.0" });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(ct), server.connect(st)]);
  });

  it("is registered and appears in listTools", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "wound_calculator");
    expect(tool).toBeDefined();
    expect(tool!.description).toContain("wound");
  });

  it("returns formatted markdown for a basic attack", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 10,
        hit_skill: 3,
        strength: 4,
        toughness: 4,
        armour_save: 3,
        damage: "1",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("Wound Calculator");
    expect(text).toContain("Attack Profile");
    expect(text).toContain("Results");
    expect(text).toContain("Key Interactions");
    expect(text).toContain("10 attacks");
    expect(text).toContain("BS/WS 3+");
  });

  it("shows AP modification in key interactions", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 10,
        hit_skill: 3,
        strength: 5,
        toughness: 4,
        armour_save: 3,
        damage: "2",
        armour_penetration: 1,
        wounds_per_model: 2,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("AP-1 modifies 3+ save to 4+");
    expect(text).toContain("Models killed");
  });

  it("shows invulnerable save interaction when invuln is better", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 10,
        hit_skill: 3,
        strength: 5,
        toughness: 4,
        armour_save: 3,
        damage: "2",
        armour_penetration: 4,
        invulnerable_save: 4,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("invulnerable save is better");
  });

  it("shows Torrent explanation in key interactions", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 6,
        hit_skill: 4,
        strength: 4,
        toughness: 4,
        armour_save: 4,
        damage: "1",
        weapon_keywords: ["Torrent"],
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("auto-hit");
    expect(text).toContain("Torrent");
  });

  it("shows weapon keyword explanations", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 10,
        hit_skill: 3,
        strength: 6,
        toughness: 4,
        armour_save: 3,
        damage: "2",
        armour_penetration: 2,
        weapon_keywords: [
          "Lethal Hits",
          "Sustained Hits 1",
          "Devastating Wounds",
        ],
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("Lethal Hits");
    expect(text).toContain("Sustained Hits");
    expect(text).toContain("Devastating Wounds");
    expect(text).toContain("mortal wound");
  });

  it("shows FNP interaction", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 10,
        hit_skill: 3,
        strength: 4,
        toughness: 4,
        armour_save: 4,
        damage: "1",
        feel_no_pain: 5,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("Feel No Pain");
    expect(text).toContain("5+++");
  });

  it("returns helpful message for Kill Team game mode", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 4,
        hit_skill: 3,
        strength: 4,
        toughness: 4,
        armour_save: 4,
        damage: "D6",
        game_mode: "kill_team",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("Kill Team");
    expect(text).toContain("different");
  });

  it("shows variable damage note for D6", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 1,
        hit_skill: 2,
        strength: 10,
        toughness: 3,
        armour_save: 7,
        damage: "D6",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("3.5");
  });

  it("shows re-roll interactions", async () => {
    const result = await client.callTool({
      name: "wound_calculator",
      arguments: {
        attacks: 10,
        hit_skill: 4,
        strength: 4,
        toughness: 4,
        armour_save: 4,
        damage: "1",
        reroll_hits: "all",
        reroll_wounds: "ones",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).toContain("Re-roll");
    expect(text).toContain("all failed hit rolls");
    expect(text).toContain("wound rolls of 1");
  });
});
