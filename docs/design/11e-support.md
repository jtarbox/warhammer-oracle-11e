# Design: 11th Edition Support

**Status:** Deferred — pick up when triggers below fire.
**Author:** Captured 2026-04-26 during fleet QA session.
**Scope:** Adding Warhammer 40,000 11th Edition support to `warhammer-oracle` without breaking existing 10e users, and establishing edition-disambiguation discipline that scales to future editions and game variants.

---

## Why this doc exists

Games Workshop announced **Warhammer 40,000 11th Edition** at AdeptiCon 2026 (March), launching **June 2026**. We're not making changes yet — there's no source data and the launch is weeks away — but the design decisions need to be captured now while the thinking is fresh, so the future session that picks this up doesn't have to re-derive it.

This doc is the answer to: "how do we add 11e without breaking 10e, and without the oracle starting to give 'diffuse' answers that mash editions together?"

---

## Triggers — when to act on this doc

Pick this up when **any** of the following becomes true:

1. **`BSData/wh40k-11e` repo appears on GitHub.** BSData typically creates a new edition's repo 2–6 weeks after GW launch. Check `https://github.com/orgs/BSData/repositories`.
2. **First 11e codex datafiles land in the new BSData repo with non-trivial coverage** (more than just core rules — at least 2–3 factions).
3. **Community-tournament / players' demand surfaces in issues or comments** asking for 11e support.

The triggers are deliberately about **data availability**, not GW's launch date. We can't ship 11e support before there's data to ship, and BSData's coverage lags GW by ~2–3 months historically.

Realistic timeline as of writing:
- GW launches: June 2026
- BSData wh40k-11e repo created: mid-June to late-July 2026
- BSData "ship-ready" coverage: September–October 2026
- We'd start the work then, ship by end of 2026.

---

## Foundational principles (non-negotiable)

### 1. 10e support is permanent. Period.

People will play 10e for **10 more years.** Tournament scenes lag editions by 1–2 cycles, codex investment is sticky, painted armies don't expire, and there's permanent demand. More importantly, **permanently supporting old editions is a competitive moat** — most fan-data tools die when the next edition launches because they pivot. Ours sticks around.

**Implication:** every `game_mode` value, once added, lives forever. The mode taxonomy is **append-only**. No deprecation, no removal, no "expires after Q1 2027". Anyone pinned to `40k_10e` keeps working unchanged for the lifetime of the package.

### 2. One package, both editions

`warhammer-oracle` stays a single npm package. Both 10e and 11e (and Combat Patrol, Kill Team, etc.) coexist behind the `mode` parameter. Reasoning:
- Players run mixed armies during transition periods.
- Doubling the package count doubles the discoverability cost and the maintenance burden.
- Schema-per-edition is cleanly modelable in one DB; SQLite/JSON layer can keep each edition's rows partitioned cleanly.

### 3. Additive changes only

New editions add to the API surface; never remove, rename, or repurpose existing fields. A user who installed `warhammer-oracle@0.1.x` and queries `mode: "40k"` should keep getting 10e answers indefinitely (with a soft default-flip note — see Rule 4 below).

No 1.0.0 breaking pivot. No major-version reset. **The product is the long-tail support; breaking changes destroy the moat.**

---

## The core product problem: edition disambiguation

This is the actual hard problem 11e introduces — not the data ingestion, not the storage choice. It has three failure modes:

1. **Wrong default.** User asks about "Tactical Marines" with no edition context. Oracle picks 10e silently. User assumes it's 11e because that's what they're playing this week. Confidently wrong answer.
2. **Cross-mode pollution.** User asks "what changed in Shooting phase?" Oracle returns a mash of 10e steps + 11e steps + Kill Team's Firefight phase. Useless soup.
3. **Combat Patrol spillage.** User asks for a Tactical Squad datasheet. Oracle returns the Combat Patrol point cost / restricted profile. They build a 2000-pt list using CP's reduced kit. Tournament disaster.

Currently the oracle has `game_mode: "40k" | "combat_patrol" | "kill_team"` with `default: "40k"`. Once 11e exists, **"40k" alone is meaningless** — it could mean either edition.

### Five rules that fix this

These are testable, not philosophical. The proposal that picks up this work should treat them as acceptance criteria.

**Rule 1 — Every response is mode-stamped at the top.**

```
# Tactical Marines  [Mode: 40k 11e]
M:6"  T:4  SV:3+  W:2  LD:6+  OC:2
…
```

Even if the LLM forgot to set the mode, the user reads the reply and sees the mode in the header. Wrong defaults get caught at the point of use, not days later when someone notices the army list is illegal.

**Rule 2 — Within a single response, never mix modes.**

A `lookup_unit` call answers from exactly one mode. Period. If the user wants a comparison across modes, they use `compare_units` with mode pinned per item:

```ts
compare_units({
  items: [
    { name: "Tactical Marines", mode: "40k_10e" },
    { name: "Tactical Marines", mode: "40k_11e" },
  ]
})
```

This makes cross-mode comparison *possible* but *explicit*. No silent mash-ups.

**Rule 3 — Defaults are explicit, declared in tool descriptions.**

> "Defaults to `40k_10e` if `mode` is not specified. For 11th edition, pass `mode: '40k_11e'`. For Combat Patrol, pass `mode: 'combat_patrol_10e'` or `'combat_patrol_11e'`."

The LLM client sees this. If the user said "I'm playing 10e", a competent LLM pins the mode. If the LLM picks wrong, Rule 1 surfaces it.

**Rule 4 — The default tracks the live edition, but only after BSData has parity.**

When 11e launches in June 2026, the default stays `40k_10e` until BSData's wh40k-11e repo is rich enough to be authoritative — probably autumn 2026. We can flip the default in a minor version with a CHANGELOG note. Anyone pinned to `40k_10e` keeps working unchanged. **Default flips are documented events**, not silent.

**Rule 5 — Combat Patrol and Kill Team get their own edition suffixes.**

When 11e ships, Combat Patrol will get an 11e revision. So `combat_patrol_10e` and `combat_patrol_11e` are distinct modes from day one. Same for Kill Team seasons (`kill_team_2024`, etc., when GW reboots). **Never assume a sub-format inherits its parent's edition automatically** — make it explicit in the mode string.

### Mode taxonomy at maturity

Given Rule 1's permanence, here's where the mode list ends up after a decade of additions:

```
40k_10e            kill_team_2024
40k_11e            kill_team_2027    (hypothetical next reboot)
40k_12e (future)   necromunda_house_of (future expansion)
combat_patrol_10e  horus_heresy_2_0   (future expansion)
combat_patrol_11e
```

Append-only. After 10 years, maybe 15–20 modes. That's fine — they're an enum, not a tool surface explosion. **The 6 tools stay 6.** The expansion is in the data and the mode parameter, not in the tool count.

---

## Architecture decisions

| Decision | Choice | Why |
|---|---|---|
| Edition coexistence model | **A — one package, both editions** | Mixed armies during transition; lower install friction; lower maintenance burden than two packages. |
| Versioning | **Additive minor versions** | Adding `40k_11e` is a 0.x → 0.(x+1) change, not 1.0.0. Breaking changes destroy the long-tail moat. |
| 10e lifecycle | **Permanent** | Append-only mode taxonomy; never remove. |
| Default mode flip | **Soft, documented event** | Stay `40k_10e` until BSData's 11e coverage is authoritative; flip in a minor version with a CHANGELOG note. Pinned consumers unaffected. |
| Cross-mode behaviour | **Explicit only** | Per Rule 2 — `compare_units` accepts per-item mode; everything else is single-mode per response. |
| Storage migration to SQLite | **Deferred, separate work** | The disambiguation rules are higher leverage. Storage refactor is internal; users don't see it. Bundle with 11e if convenient at the time, otherwise its own milestone. |

---

## Implementation phases (when triggered)

```
Phase 1 — Disambiguation discipline (1-2 days)
  Add explicit `mode` parameter to every tool, default `40k_10e`.
  Stamp every response with `[Mode: ...]` header (Rule 1).
  Reword tool descriptions per Rule 3.
  Existing 3 modes get edition suffixes: 40k_10e, combat_patrol_10e,
  kill_team_2024 (rename current kill_team to be edition-specific).
  Ship as 0.2.0 — additive, no break for current users.
  Deprecation note: the bare strings ("40k", "combat_patrol") still
  resolve to their *_10e equivalent for one minor version, then warn,
  then remove from the enum at 0.4.0 or so. Soft transition.

Phase 2 — 11e mode plumbing (1 day, when BSData repo created)
  Add 40k_11e and combat_patrol_11e to the mode enum.
  Empty data, but schema and tests in place.
  Ship as 0.3.0 — additive.

Phase 3 — 11e data wiring (2-3 days, when BSData has coverage)
  Update fetch-data.ts to pull from BSData/wh40k-11e.
  Map 11e XML to whatever schema we have (TS modules currently;
  SQLite if migrated).
  Daily sync workflow (sync-data.yml) starts auto-publishing.
  Ship as 0.4.0 — additive, 11e data populated.

Phase 4 — Default flip (when 11e parity solid)
  Default `mode` flips from 40k_10e to 40k_11e.
  CHANGELOG entry. Minor version (0.5.0).
  Pinned 10e consumers unaffected.

Phase 5 — Optional: SQLite migration
  Replace 6.5 MB hand-coded `units.ts` with SQLite. Internal.
  Bring warhammer in line with the rest of the fleet.
  Standalone work, can happen any time after Phase 1.
```

Phases 1, 2, 5 are independent of GW's calendar. Phase 1 is the highest-leverage work.

---

## Open questions for the implementation session

These weren't decided in April 2026; the proposal that picks this up should resolve them:

1. **Soft transition for bare mode strings.** When `mode: "40k"` (no edition) is sent — should we (a) silently resolve to current default, (b) resolve + add a soft deprecation note in the response, (c) reject with a clear error? Socrates' lean: (b) initially, (c) after one minor version.

2. **What's authoritative if BSData has 10e and 11e versions of the same unit?** Are they distinct rows keyed by `(name, mode)`? Probably yes, but worth confirming.

3. **`game_flow` tool — does it generalise across editions, or do we have separate flows per edition?** Probably distinct, because 11e's 70+ new Detachments may shift phase emphasis. Worth checking GW's preview rules when 11e launches.

4. **Do we add `Necromunda` and `Horus Heresy` modes at the same time?** They're 40k-family, BSData maintains both. Tempting to bundle. Counter-argument: scope creep on what's already a high-traffic product. Decide at proposal time.

5. **Storage: stay on TS modules or migrate to SQLite?** TS modules hit limits eventually (`units.ts` is already 6.5 MB). Migration is a 2–3 day refactor. Bundle with 11e if convenient, otherwise its own milestone.

---

## How to use this doc when triggered

1. Read this doc end-to-end.
2. Run `/opsx:propose` with the directional answers above (model A, additive, append-only, 5 rules).
3. The proposal generates `proposal.md` + `design.md` + `specs/` + `tasks.md` in `openspec/changes/11e-support/`.
4. Resolve the open questions in section above as part of the proposal's design step.
5. Hand off to Superpowers for implementation per the Phase plan.
6. Sync back to the master spec via `/opsx:archive` after each phase ships.

**Do not skip the proposal step.** This doc is the directional input, not a substitute for OpenSpec. The detailed task breakdown is what OpenSpec produces — this is just to ensure the proposal goes in pre-aligned, not green-field.

---

## Why this is captured now and not later

Two reasons:

1. **The "10 more years" insight is an architectural commitment, not a feature note.** Permanent edition support isn't a thing you decide casually mid-implementation; it shapes the schema, the API surface, and the upgrade story from day one. Capturing it now means the future session can't accidentally design it away.

2. **The disambiguation rules are easy to half-implement.** "Add a `mode` parameter and an enum" is the surface fix. "Mode-stamp every response, reject cross-mode mixing, flip defaults as documented events" is the actual product discipline. Without this doc, only the surface fix lands.

When the future session reads this, it should feel slightly opinionated — that's the point. The opinions were paid for in this April 2026 conversation.
