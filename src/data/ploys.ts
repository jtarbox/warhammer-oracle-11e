import type { Ploy } from "../types.js";

// === Universal Ploys (Kill Team 2024 Edition) ===
// These ploys are available to every Kill Team regardless of faction.
// Source: Kill Team Core Rules (2024 Edition)

const UNIVERSAL_STRATEGIC_PLOYS: Ploy[] = [
  {
    name: "Bolster",
    faction: "Universal",
    type: "strategic",
    cpCost: 1,
    when: "Use during the Strategy phase.",
    effect:
      "Select one friendly operative. Until the end of the Turning Point, that operative has a 4+ invulnerable save. This save is used instead of the operative's normal save if it would be better.",
    gameMode: "kill_team",
  },
  {
    name: "Regroup",
    faction: "Universal",
    type: "strategic",
    cpCost: 1,
    when: "Use at the end of the Strategy phase.",
    effect:
      "Select one friendly operative. Remove all conditions (such as Injured, Activated, etc.) from that operative. This can effectively 'reset' an operative that has accumulated negative status effects.",
    gameMode: "kill_team",
  },
  {
    name: "Overwatch",
    faction: "Universal",
    type: "strategic",
    cpCost: 1,
    when: "Use during the Strategy phase.",
    effect:
      "Select one friendly ready operative with a ranged weapon. That operative is on Overwatch for this Turning Point. Once during the Firefight phase, when an enemy operative that is visible to and within range of the Overwatch operative performs a move action, you can interrupt that activation: the Overwatch operative immediately makes a free Shoot action against that enemy operative, then the enemy activation continues. The Overwatch operative's order is then changed to activated.",
    restrictions:
      "The operative must be ready and have a ranged weapon. The Overwatch Shoot action can only target the enemy operative that triggered it.",
    gameMode: "kill_team",
  },
];

const UNIVERSAL_TACTICAL_PLOYS: Ploy[] = [
  {
    name: "Command Re-roll",
    faction: "Universal",
    type: "tactical",
    cpCost: 1,
    when: "Use when you are required to roll a die or dice for an operative (e.g. a shooting attack, a defence roll, a dash roll).",
    effect:
      "Re-roll one of those dice. You can use this ploy to re-roll one attack die, one defence die, or any other single die roll made for one of your operatives.",
    gameMode: "kill_team",
  },
  {
    name: "Desperate Defence",
    faction: "Universal",
    type: "tactical",
    cpCost: 1,
    when: "Use when a friendly operative is the target of a shooting or fighting attack.",
    effect:
      "Until the end of that combat or shooting sequence, worsen the attacking weapon's critical hit damage by 1 (to a minimum of 3). For example, a weapon with critical damage 5 would deal 4 critical damage instead. This can make the difference between an operative surviving or being taken out.",
    gameMode: "kill_team",
  },
];

// === Faction-Specific Ploys (examples) ===
// These demonstrate the pattern for faction-specific ploys. Faction names match
// the kill-team-operatives data exactly.

const LEGIONARIES_PLOYS: Ploy[] = [
  {
    name: "Hateful Assault",
    faction: "Legionaries",
    type: "strategic",
    cpCost: 1,
    when: "Use during the Strategy phase.",
    effect:
      "Select one friendly LEGIONARIES operative. Until the end of the Turning Point, each time that operative fights in combat, you can re-roll one of your attack dice.",
    gameMode: "kill_team",
  },
  {
    name: "Malicious Volleys",
    faction: "Legionaries",
    type: "strategic",
    cpCost: 1,
    when: "Use during the Strategy phase.",
    effect:
      "Select one friendly LEGIONARIES operative equipped with a bolt weapon (bolt pistol, boltgun, or combi-bolter). Until the end of the Turning Point, each time that operative makes a shooting attack with that weapon, you can retain one normal hit as a successful hit without rolling it.",
    gameMode: "kill_team",
  },
  {
    name: "Veterans of the Long War",
    faction: "Legionaries",
    type: "tactical",
    cpCost: 1,
    when: "Use when a friendly LEGIONARIES operative is activated.",
    effect:
      "Until the end of that operative's activation, each time it makes an attack (shooting or fighting), improve the Normal Damage characteristic of the weapon it is using by 1.",
    gameMode: "kill_team",
  },
];

const KOMMANDOS_PLOYS: Ploy[] = [
  {
    name: "Skulk About",
    faction: "Kommandos",
    type: "strategic",
    cpCost: 1,
    when: "Use during the Strategy phase.",
    effect:
      "Select one friendly KOMMANDOS operative with a Conceal order. Until the end of the Turning Point, that operative can retain one automatic success on defence rolls as if it were in cover, even if it is not in cover. This makes it harder for enemies to land effective shots on the operative.",
    gameMode: "kill_team",
  },
  {
    name: "Dakka Dakka Dakka!",
    faction: "Kommandos",
    type: "tactical",
    cpCost: 1,
    when: "Use when a friendly KOMMANDOS operative makes a shooting attack.",
    effect:
      "For that shooting attack, you can re-roll any or all of your attack dice.",
    gameMode: "kill_team",
  },
  {
    name: "Krump 'Em",
    faction: "Kommandos",
    type: "tactical",
    cpCost: 1,
    when: "Use when a friendly KOMMANDOS operative fights in combat.",
    effect:
      "For that combat, your operative's melee weapons gain the Brutal special rule (the opponent can only parry with critical successes).",
    gameMode: "kill_team",
  },
];

const ANGELS_OF_DEATH_PLOYS: Ploy[] = [
  {
    name: "Bolter Discipline",
    faction: "Angels of Death",
    type: "strategic",
    cpCost: 1,
    when: "Use during the Strategy phase.",
    effect:
      "Select one friendly ANGELS OF DEATH operative equipped with a bolt weapon. Until the end of the Turning Point, each time that operative makes a shooting attack with a bolt weapon, you can retain one attack die result of 5+ that is a failure as a normal success instead.",
    gameMode: "kill_team",
  },
  {
    name: "Shock Assault",
    faction: "Angels of Death",
    type: "tactical",
    cpCost: 1,
    when: "Use when a friendly ANGELS OF DEATH operative fights in combat, if it performed a Charge action during this activation.",
    effect:
      "For that combat, your operative's melee critical hit damage is improved by 1.",
    gameMode: "kill_team",
  },
  {
    name: "Transhuman Physiology",
    faction: "Angels of Death",
    type: "tactical",
    cpCost: 1,
    when: "Use when a friendly ANGELS OF DEATH operative is the target of a shooting attack.",
    effect:
      "For that shooting attack, your operative can ignore any or all modifiers to its Save characteristic. In addition, it can re-roll one defence die.",
    gameMode: "kill_team",
  },
];

export const PLOYS: Ploy[] = [
  ...UNIVERSAL_STRATEGIC_PLOYS,
  ...UNIVERSAL_TACTICAL_PLOYS,
  ...LEGIONARIES_PLOYS,
  ...KOMMANDOS_PLOYS,
  ...ANGELS_OF_DEATH_PLOYS,
];
