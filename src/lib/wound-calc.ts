/**
 * Warhammer 40K wound probability calculator — pure math engine.
 * No MCP or BSData dependencies.
 */

export interface WoundCalcInput {
  attacks: number;
  hitSkill: number; // 2-6, the number needed on a d6
  strength: number;
  toughness: number;
  armourSave: number; // 2-7 (7 means no save)
  armourPenetration?: number; // 0-6, positive number
  damage: string; // "1", "2", "D3", "D6", "D6+1", "2D6", "D3+1", etc.
  invulnerableSave?: number; // 2-6
  feelNoPain?: number; // 2-6
  rerollHits?: "ones" | "all";
  rerollWounds?: "ones" | "all";
  weaponKeywords?: string[]; // "Lethal Hits", "Devastating Wounds", "Sustained Hits 1", "Torrent", "Twin-linked"
  woundsPerModel?: number; // for models killed calculation
}

export interface WoundCalcResult {
  expectedHits: number;
  expectedWounds: number;
  expectedUnsaved: number;
  expectedDamage: number;
  expectedModelsKilled: number | null; // null if woundsPerModel not provided
  mortalWoundDamage: number; // from Devastating Wounds
  hitProbability: number; // 0-1
  woundProbability: number; // 0-1
  saveProbability: number; // 0-1 (probability of FAILING save)
  fnpFailProbability: number; // 0-1
}

/** Parse the damage string to an average numeric value. */
export function parseDamage(dmg: string): number {
  const s = dmg.trim().toUpperCase();

  // "2D6", "3D6", etc.
  const multiDice = s.match(/^(\d+)D(\d+)$/);
  if (multiDice) {
    const count = parseInt(multiDice[1], 10);
    const sides = parseInt(multiDice[2], 10);
    return count * ((sides + 1) / 2);
  }

  // "D6+N" or "D3+N"
  const dicePlus = s.match(/^D(\d+)\+(\d+)$/);
  if (dicePlus) {
    const sides = parseInt(dicePlus[1], 10);
    const bonus = parseInt(dicePlus[2], 10);
    return (sides + 1) / 2 + bonus;
  }

  // "D6" or "D3"
  const singleDice = s.match(/^D(\d+)$/);
  if (singleDice) {
    const sides = parseInt(singleDice[1], 10);
    return (sides + 1) / 2;
  }

  // Fixed number
  const fixed = parseInt(s, 10);
  if (!isNaN(fixed)) return fixed;

  throw new Error(`Cannot parse damage value: "${dmg}"`);
}

/** Parse "Sustained Hits N" from weapon keywords, returns N or 0. */
function parseSustainedHits(keywords: string[]): number {
  for (const kw of keywords) {
    const match = kw.match(/sustained\s+hits?\s+(\d+)/i);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

function hasKeyword(keywords: string[], name: string): boolean {
  return keywords.some((kw) => kw.toLowerCase() === name.toLowerCase());
}

/**
 * Core probability: P(rolling target or higher on a d6).
 * target must be 2-6 for normal rolls. Returns 0 for impossible, 1 for auto.
 */
function probOfTarget(target: number): number {
  if (target <= 1) return 1;
  if (target >= 7) return 0;
  return (7 - target) / 6;
}

/** Probability with re-rolls. */
function probWithReroll(
  baseProb: number,
  reroll: "ones" | "all" | undefined,
): number {
  if (!reroll) return baseProb;
  if (reroll === "ones") {
    // Re-roll 1s: P(hit) + P(rolled 1) * P(hit on reroll)
    return baseProb + (1 / 6) * baseProb;
  }
  // Re-roll all misses: P(hit) + P(miss) * P(hit)
  return baseProb + (1 - baseProb) * baseProb;
}

/** Determine wound roll target from S vs T. */
function woundTarget(strength: number, toughness: number): number {
  if (strength >= 2 * toughness) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (toughness >= 2 * strength) return 6;
  return 5; // T > S but T < 2*S
}

export function calculateWounds(input: WoundCalcInput): WoundCalcResult {
  const {
    attacks,
    hitSkill,
    strength,
    toughness,
    armourSave,
    damage,
    invulnerableSave,
    feelNoPain,
    woundsPerModel,
  } = input;
  const ap = input.armourPenetration ?? 0;
  const rerollHits = input.rerollHits;
  const keywords = input.weaponKeywords ?? [];

  const isTorrent = hasKeyword(keywords, "Torrent");
  const isLethalHits = hasKeyword(keywords, "Lethal Hits");
  const isDevastatingWounds = hasKeyword(keywords, "Devastating Wounds");
  const sustainedN = parseSustainedHits(keywords);
  const isTwinLinked = hasKeyword(keywords, "Twin-linked");

  // Determine re-roll policies
  const effectiveRerollWounds =
    isTwinLinked ? "all" : (input.rerollWounds ?? undefined);

  // === Step 1: Hits ===
  let hitProb: number;
  let expectedHits: number;
  let lethalHitCount = 0;
  let sustainedExtraHits = 0;

  if (isTorrent) {
    // Auto-hits — no hit roll
    hitProb = 1;
    expectedHits = attacks;
    // No natural 6s to hit since there's no hit roll — Lethal Hits and Sustained Hits don't trigger
  } else {
    const baseHitProb = probOfTarget(hitSkill);
    hitProb = probWithReroll(baseHitProb, rerollHits);

    // Natural 6s to hit (before re-rolls affect 6-counting)
    // P(rolling a natural 6) from original rolls = 1/6
    // From re-rolled dice (1s or misses), the chance of getting a 6 is also 1/6
    // Total expected natural 6s:
    let expected6sToHit: number;
    if (!rerollHits) {
      expected6sToHit = attacks * (1 / 6);
    } else if (rerollHits === "ones") {
      // Original 6s (1/6 of attacks) + rerolled 1s that become 6s (1/6 * 1/6 of attacks)
      expected6sToHit = attacks * (1 / 6 + (1 / 6) * (1 / 6));
    } else {
      // "all" — Original 6s + rerolled misses that become 6s
      // Misses on first roll = (hitSkill - 1) / 6
      const missProb = (hitSkill - 1) / 6;
      expected6sToHit = attacks * (1 / 6 + missProb * (1 / 6));
    }

    // Sustained Hits: each natural 6 generates N extra hits (auto-hit, go to wound step)
    if (sustainedN > 0) {
      sustainedExtraHits = expected6sToHit * sustainedN;
    }

    // Lethal Hits: natural 6s to hit auto-wound (skip wound roll)
    if (isLethalHits) {
      lethalHitCount = expected6sToHit;
    }

    // Normal hits (not counting lethal hits which bypass wound roll)
    expectedHits = attacks * hitProb + sustainedExtraHits;
  }

  // === Step 2: Wounds ===
  const wTarget = woundTarget(strength, toughness);
  const baseWoundProb = probOfTarget(wTarget);
  const woundProb = probWithReroll(baseWoundProb, effectiveRerollWounds);

  // Hits that go through wound roll = total hits minus lethal hits (which skip wound roll)
  let hitsToWoundRoll: number;
  if (isLethalHits && !isTorrent) {
    // Lethal hits skip wound roll entirely; the rest go through normally
    hitsToWoundRoll = expectedHits - lethalHitCount;
  } else {
    hitsToWoundRoll = expectedHits;
  }

  const woundsFromRolling = hitsToWoundRoll * woundProb;
  const woundsFromLethal = lethalHitCount; // auto-wound, no roll needed

  // Devastating Wounds: natural 6s to wound become mortal wounds (bypass saves)
  // Only applies to wounds that are actually rolled — not lethal hits
  let devastatingWoundCount = 0;
  if (isDevastatingWounds && hitsToWoundRoll > 0) {
    // Expected natural 6s among wound rolls
    // With re-rolls, we need: expected 6s from initial rolls + expected 6s from rerolled dice
    let expected6sToWound: number;
    if (!effectiveRerollWounds) {
      expected6sToWound = hitsToWoundRoll * (1 / 6);
    } else if (effectiveRerollWounds === "ones") {
      expected6sToWound =
        hitsToWoundRoll * (1 / 6 + (1 / 6) * (1 / 6));
    } else {
      const woundMissProb = (wTarget - 1) / 6;
      expected6sToWound =
        hitsToWoundRoll * (1 / 6 + woundMissProb * (1 / 6));
    }
    devastatingWoundCount = expected6sToWound;
  }

  // Total wounds = rolled wounds (minus devastating) + lethal hits + devastating
  const normalWounds =
    woundsFromRolling - devastatingWoundCount + woundsFromLethal;
  const totalWounds = normalWounds + devastatingWoundCount;

  // === Step 3: Saves ===
  const modifiedArmourSave = armourSave + ap;
  let effectiveSave: number;
  if (invulnerableSave !== undefined) {
    // Use the better (lower) of modified armour save or invuln
    effectiveSave = Math.min(modifiedArmourSave, invulnerableSave);
  } else {
    effectiveSave = modifiedArmourSave;
  }

  // Clamp: if effective save > 6, it auto-fails
  const savePassProb = effectiveSave <= 6 ? probOfTarget(effectiveSave) : 0;
  const saveFailProb = 1 - savePassProb;

  // Normal wounds go through saves; devastating wounds bypass saves
  const unsavedFromNormal = normalWounds * saveFailProb;
  const unsavedFromDevastating = devastatingWoundCount; // bypass saves entirely
  const expectedUnsaved = unsavedFromNormal + unsavedFromDevastating;

  // === Step 4: Damage ===
  const avgDamage = parseDamage(damage);
  const rawDamage = expectedUnsaved * avgDamage;

  // Devastating wound damage calculated separately (but already included in unsaved)
  const mortalWoundDamage = unsavedFromDevastating * avgDamage;

  // === Step 5: Feel No Pain ===
  let fnpFailProb = 1;
  if (feelNoPain !== undefined) {
    const fnpPassProb = probOfTarget(feelNoPain);
    fnpFailProb = 1 - fnpPassProb;
  }
  const expectedDamage = rawDamage * fnpFailProb;

  // === Step 6: Models killed ===
  let expectedModelsKilled: number | null = null;
  if (woundsPerModel !== undefined) {
    expectedModelsKilled = Math.floor(expectedDamage / woundsPerModel);
  }

  return {
    expectedHits: roundTo(expectedHits, 2),
    expectedWounds: roundTo(totalWounds, 2),
    expectedUnsaved: roundTo(expectedUnsaved, 2),
    expectedDamage: roundTo(expectedDamage, 2),
    expectedModelsKilled,
    mortalWoundDamage: roundTo(mortalWoundDamage, 2),
    hitProbability: roundTo(hitProb, 4),
    woundProbability: roundTo(woundProb, 4),
    saveProbability: roundTo(saveFailProb, 4),
    fnpFailProbability: roundTo(fnpFailProb, 4),
  };
}

function roundTo(n: number, places: number): number {
  const factor = Math.pow(10, places);
  return Math.round(n * factor) / factor;
}
