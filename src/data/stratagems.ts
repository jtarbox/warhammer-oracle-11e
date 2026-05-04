import type { Stratagem } from "../types.js";

// === Core Stratagems (10th Edition) ===
// These are the universal stratagems available to every army in Warhammer 40,000 10th edition.
// Source: Warhammer 40,000 Core Rules (10th Edition, 2023)

const CORE_STRATAGEMS: Stratagem[] = [
  {
    name: "Command Re-roll",
    faction: "Core",
    detachment: null,
    type: "strategic_ploy",
    cpCost: 1,
    phase: "Any phase",
    when: "Any phase, just after you have made a hit roll, a wound roll, a damage roll, a saving throw, an Advance roll, a Charge roll, or a Desperate Escape test.",
    target: "The unit that made the roll or test.",
    effect:
      "Re-roll that hit roll, wound roll, damage roll, saving throw, Advance roll, Charge roll, or Desperate Escape test.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Counter-offensive",
    faction: "Core",
    detachment: null,
    type: "strategic_ploy",
    cpCost: 2,
    phase: "Fight phase",
    when: "Fight phase, just after an enemy unit has fought.",
    target:
      "One of your units that is within Engagement Range of one or more enemy units and has not already been selected to fight this phase.",
    effect:
      "Your unit fights next. It cannot be interrupted by any other unit until after it has finished fighting.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Epic Challenge",
    faction: "Core",
    detachment: null,
    type: "epic_deed",
    cpCost: 1,
    phase: "Fight phase",
    when: "Fight phase, when a CHARACTER unit from your army is selected to fight.",
    target: "One CHARACTER model in your unit.",
    effect:
      "Until the end of the phase, melee weapons equipped by that model have the [PRECISION] ability and you can re-roll wound rolls when targeting a CHARACTER unit.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Fire Overwatch",
    faction: "Core",
    detachment: null,
    type: "strategic_ploy",
    cpCost: 1,
    phase: "Opponent's Movement or Charge phase",
    when: "Your opponent's Movement phase or Charge phase, just after an enemy unit is set up or ends a Normal, Advance, Fall Back, or Charge move.",
    target:
      "One of your units that is within 24\" of that enemy unit and would be eligible to shoot.",
    effect:
      "Your unit can shoot at that enemy unit as if it were your Shooting phase, but models in your unit can only make attacks using ranged weapons, and when resolving those attacks, unmodified hit rolls of 6 are required for a hit, irrespective of the attacking weapon's Ballistic Skill or any modifiers. After resolving those attacks, Overwatch ends. You can only use this Stratagem once per turn.",
    restrictions:
      "Cannot be used more than once per turn. Blast weapons cannot be used.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Go to Ground",
    faction: "Core",
    detachment: null,
    type: "battle_tactic",
    cpCost: 1,
    phase: "Opponent's Shooting phase",
    when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.",
    target:
      "One INFANTRY unit from your army that was selected as the target of one or more of the attacking unit's attacks.",
    effect:
      "Until the end of the phase, all models in your unit have a Save characteristic of 6+ if it is not already better, and have the Benefit of Cover.",
    restrictions:
      "INFANTRY only. Cannot be used on a unit that is within Engagement Range of one or more enemy units.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Grenade",
    faction: "Core",
    detachment: null,
    type: "wargear",
    cpCost: 1,
    phase: "Shooting phase",
    when: "Your Shooting phase.",
    target:
      "One GRENADES unit from your army that is not within Engagement Range of one or more enemy units and has not been selected to shoot this phase.",
    effect:
      "Select one model in that unit; that model can only make one attack this phase using the Grenade weapon profile: Range 6\", A1, BS 3+, S4, AP 0, D1 with [ASSAULT] and [BLAST] abilities. This is in addition to any other attacks made by other models in that unit.",
    restrictions:
      "Unit must have the GRENADES keyword. The model only makes one attack with the grenade profile.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Heroic Intervention",
    faction: "Core",
    detachment: null,
    type: "strategic_ploy",
    cpCost: 2,
    phase: "Opponent's Charge phase",
    when: "Your opponent's Charge phase, just after an enemy unit ends a Charge move.",
    target:
      "One of your units that is within 6\" of that enemy unit and is not within Engagement Range of one or more enemy units.",
    effect:
      "Your unit can make a Heroic Intervention move of up to 6\". Each model in that unit can move up to 6\", but each model must end that move closer to the nearest enemy model. Your unit must end this move within Engagement Range of the enemy unit that just charged.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Insane Bravery",
    faction: "Core",
    detachment: null,
    type: "epic_deed",
    cpCost: 1,
    phase: "Any phase (Battle-shock step)",
    when: "Battle-shock step of the Command phase, just after you have failed a Battle-shock test for a unit from your army.",
    target: "The unit from your army that just failed that Battle-shock test.",
    effect:
      "Your unit is treated as having passed that Battle-shock test instead, and is not Battle-shocked.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Rapid Ingress",
    faction: "Core",
    detachment: null,
    type: "strategic_ploy",
    cpCost: 1,
    phase: "Opponent's Movement phase",
    when: "End of your opponent's Movement phase.",
    target:
      "One unit from your army that is in Reserves.",
    effect:
      "Your unit can be set up on the battlefield, following all normal Reserve rules (more than 9\" from all enemy models, not in the enemy's deployment zone, etc.). This happens at the end of your opponent's Movement phase rather than during your own turn.",
    restrictions:
      "Cannot be used in the first battle round. The unit must follow all normal Deep Strike / Reserves restrictions.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Smokescreen",
    faction: "Core",
    detachment: null,
    type: "wargear",
    cpCost: 1,
    phase: "Opponent's Shooting phase",
    when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.",
    target:
      "One SMOKE unit from your army that was selected as the target of one or more of the attacking unit's attacks.",
    effect:
      "Until the end of the phase, all models in your unit have the Benefit of Cover and the Stealth ability (subtract 1 from hit rolls targeting this unit).",
    restrictions: "Unit must have the SMOKE keyword.",
    gameModes: ["40k", "combat_patrol"],
  },
  {
    name: "Tank Shock",
    faction: "Core",
    detachment: null,
    type: "strategic_ploy",
    cpCost: 1,
    phase: "Charge phase",
    when: "Your Charge phase, just after a VEHICLE or MONSTER unit from your army ends a Charge move.",
    target: "That VEHICLE or MONSTER unit.",
    effect:
      "Select one enemy unit within Engagement Range of your unit and roll a number of D6 equal to the Toughness characteristic of your model (if your unit has more than one model, use the highest Toughness). For each 5+, that enemy unit suffers 1 mortal wound.",
    restrictions: "VEHICLE or MONSTER units only.",
    gameModes: ["40k", "combat_patrol"],
  },
];

// === Detachment-Specific Stratagems (examples) ===
// These demonstrate the pattern for faction/detachment-specific stratagems.

const GLADIUS_TASK_FORCE_STRATAGEMS: Stratagem[] = [
  {
    name: "Only In Death Does Duty End",
    faction: "Adeptus Astartes",
    detachment: "Gladius Task Force",
    type: "epic_deed",
    cpCost: 2,
    phase: "Fight phase",
    when: "Fight phase, just after an enemy unit has selected its targets.",
    target:
      "One ADEPTUS ASTARTES unit from your army that was selected as the target of one or more of the attacking unit's attacks, and that has not already been selected to fight this phase.",
    effect:
      "If your unit is destroyed as a result of the attacking unit's attacks, after the attacking unit has finished making its attacks, your unit can fight (make its melee attacks) before it is removed from play.",
    gameModes: ["40k"],
  },
  {
    name: "Honour the Chapter",
    faction: "Adeptus Astartes",
    detachment: "Gladius Task Force",
    type: "battle_tactic",
    cpCost: 1,
    phase: "Fight phase",
    when: "Fight phase.",
    target:
      "One ADEPTUS ASTARTES unit from your army that has not been selected to fight this phase.",
    effect:
      "Until the end of the phase, melee weapons equipped by models in your unit have the [LANCE] ability (add 1 to wound rolls if the unit charged this turn).",
    restrictions: "Cannot target units that are Battle-shocked.",
    gameModes: ["40k"],
  },
  {
    name: "Storm of Fire",
    faction: "Adeptus Astartes",
    detachment: "Gladius Task Force",
    type: "battle_tactic",
    cpCost: 1,
    phase: "Shooting phase",
    when: "Your Shooting phase.",
    target:
      "One ADEPTUS ASTARTES unit from your army that has not been selected to shoot this phase.",
    effect:
      "Until the end of the phase, ranged weapons equipped by models in your unit have the [HEAVY] ability (if the unit Remained Stationary, add 1 to hit rolls). If the unit Remained Stationary this turn, those weapons also have the [LETHAL HITS] ability.",
    restrictions: "Cannot target units that are Battle-shocked.",
    gameModes: ["40k"],
  },
];

const SLAVES_TO_DARKNESS_STRATAGEMS: Stratagem[] = [
  {
    name: "Dark Pact",
    faction: "Heretic Astartes",
    detachment: "Slaves to Darkness",
    type: "battle_tactic",
    cpCost: 1,
    phase: "Shooting phase or Fight phase",
    when: "Your Shooting phase or the Fight phase.",
    target:
      "One HERETIC ASTARTES unit from your army that has not been selected to shoot or fight this phase.",
    effect:
      "Until the end of the phase, weapons equipped by models in that unit have the [SUSTAINED HITS 1] ability. Each time a model in that unit makes an attack, after resolving that attack, if a Critical Hit was scored, that model's unit suffers 1 mortal wound after the attacking unit has finished making its attacks.",
    restrictions:
      "The mortal wound cost applies after scoring Critical Hits — be careful with large volumes of fire.",
    gameModes: ["40k"],
  },
  {
    name: "Profane Zeal",
    faction: "Heretic Astartes",
    detachment: "Slaves to Darkness",
    type: "epic_deed",
    cpCost: 1,
    phase: "Any phase",
    when: "Any phase, just after a HERETIC ASTARTES CHARACTER model in your army is destroyed.",
    target: "That destroyed CHARACTER model.",
    effect:
      "Roll one D6: on a 2+, that model is not destroyed and is set back up on the battlefield as close as possible to where it was, with D3 wounds remaining. Each model can only be the target of this Stratagem once per battle.",
    restrictions:
      "Once per battle per model. Cannot be used on a model that has already been set back up by this Stratagem.",
    gameModes: ["40k"],
  },
  {
    name: "Eternal Hate",
    faction: "Heretic Astartes",
    detachment: "Slaves to Darkness",
    type: "battle_tactic",
    cpCost: 1,
    phase: "Fight phase",
    when: "Fight phase.",
    target:
      "One HERETIC ASTARTES unit from your army that has not been selected to fight this phase and is within Engagement Range of one or more enemy units.",
    effect:
      "Until the end of the phase, each time a model in your unit makes a melee attack, add 1 to the Hit roll.",
    restrictions: "Cannot target units that are Battle-shocked.",
    gameModes: ["40k"],
  },
];

export const STRATAGEMS: Stratagem[] = [
  ...CORE_STRATAGEMS,
  ...GLADIUS_TASK_FORCE_STRATAGEMS,
  ...SLAVES_TO_DARKNESS_STRATAGEMS,
];
