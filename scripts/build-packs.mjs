#!/usr/bin/env node
/**
 * Generates Foundry compendium JSON source files from the icon TypeScript source data.
 *
 * Usage:
 *   node scripts/build-packs.mjs       (generate JSON only)
 *   npm run build:packs                (generate JSON + compile to LevelDB)
 *
 * Source data is read from /Users/jaredlindauer/github/icon/src/data/
 * Output goes to src/packs/{packname}/ as Foundry Item JSON.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dir, '..');
const ICON_DATA = '/Users/jaredlindauer/github/icon/src/data';

// ── ID generation ─────────────────────────────────────────────────────────────
// Deterministic 16-char alphanumeric ID from a seed string.
function mkId(seed) {
  return createHash('sha1').update(seed).digest('hex').slice(0, 16);
}

// ── TypeScript → JavaScript stripping ────────────────────────────────────────
// Handles only the simple patterns present in icon/src/data/**/*.ts
function stripTs(code) {
  // Remove: import type { ... } from '...'
  code = code.replace(/^import type \{[^}]+\} from '[^']+';?\r?\n?/gm, '');
  // Remove: export type Foo = 'a' | 'b' | 'c';
  code = code.replace(/^export type \w+ = [^{][^;]*;\r?\n?/gm, '');
  // Remove: export interface Foo { ... }  (no nested braces in these files)
  code = code.replace(/^export interface \w+[^{]*\{[^{}]*\}\r?\n?/gm, '');
  // Remove top-level const type annotations:  export const foo: TypeName = …
  code = code.replace(/^(export const \w+): [\w<>.\[\], |]+( =)/gm, '$1$2');
  // Remove function return type annotations:  ): string | undefined {
  code = code.replace(/\)\s*:\s*[\w<>\[\] |]+(?=\s*\{)/g, ')');
  // Remove function parameter type annotations — only matches TS primitives or PascalCase types,
  // so number/string literals and object values are unaffected.
  code = code.replace(
    /(\w)\s*:\s*(string|number|boolean|void|undefined|never|[A-Z]\w*(?:\[\])?)(?=[,) ])/g,
    '$1',
  );
  return code;
}

async function loadTs(tsPath) {
  const code = readFileSync(tsPath, 'utf8');
  const js   = stripTs(code);
  // Write to a temp .mjs file, import it, then delete it
  const tmp  = tsPath.replace(/\.ts$/, '.__tmp__.mjs');
  writeFileSync(tmp, js);
  try {
    return await import(tmp);
  } finally {
    try { rmSync(tmp); } catch { /* ignore */ }
  }
}

// ── Pack directory helpers ────────────────────────────────────────────────────
function packDir(name) {
  return resolve(ROOT, 'src/packs', name);
}

function clearDir(dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.json')) rmSync(resolve(dir, f));
  }
}

function writeItem(packName, doc) {
  // _key is required by the fvtt CLI pack command to identify the LevelDB entry
  const out  = { _key: `!items!${doc._id}`, ...doc };
  const file = resolve(packDir(packName), `${doc._id}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
}

// ── Document builders ─────────────────────────────────────────────────────────

function buildCondition(cond) {
  return {
    _id:  mkId(`condition:${cond.id}`),
    name: cond.keyword,
    type: 'condition',
    system: {
      isPositive: cond.isPositive,
      keyword:    cond.keyword,
      effect:     cond.effect,
    },
  };
}

function buildBond(bond) {
  return {
    _id:  mkId(`bond:${bond.id}`),
    name: bond.name,
    type: 'bond',
    system: {
      actionOptions:  bond.actionOptions,
      ideals:         bond.ideals,
      effort:         bond.effort,
      strain:         bond.strain,
      secondWind:     bond.secondWind,
      specialAbility: {
        name:   'Special Ability',
        effect: bond.specialAbility,
      },
      powers: (bond.powers || []).map((p, i) => ({
        id:          mkId(`bond:${bond.id}:power:${i}`),
        name:        p.name,
        description: p.description,
        isGambit:    p.isGambit ?? false,
      })),
      gearKits: (bond.gearKits || []).map((k, i) => ({
        id:    mkId(`bond:${bond.id}:kit:${i}`),
        name:  k.name,
        items: typeof k.items === 'string'
          ? k.items.split(/;\s*/).filter(Boolean)
          : (k.items || []),
      })),
    },
  };
}

// Converts one Ability from the source data to an Item document.
function buildAbility(ability, jobId) {
  const id = mkId(`ability:${jobId}:${ability.id}`);
  return {
    _id:  id,
    name: ability.name,
    type: 'ability',
    system: {
      tier:   ability.tier,
      cost:   ability.cost,
      tags:   ability.tags ?? [],
      flavor: ability.flavor ?? '',
      effect: ability.effect,
      jobId,
    },
  };
}

// Converts one Talent from the source data to an Item document.
function buildTalent(talent, jobId) {
  const id = mkId(`talent:${jobId}:${talent.id}`);
  return {
    _id:  id,
    name: talent.name,
    type: 'talent',
    system: {
      effect: talent.description,
      jobId,
    },
  };
}

// Converts an apprentice job + all its advanced jobs to Job Item documents.
// Also emits all ability/talent Item documents into the provided arrays.
function buildJobGroup({ apprentice, jobs, classKey, soulMap }, abilityDocs, talentDocs) {
  const results = [];

  // ── Apprentice job ────────────────────────────────────────────────────────
  const appAbilityIds = [];
  const basicAtk = apprentice.basicAttack;

  // Basic attack as an ability item
  const basicAtkDoc = buildAbility(basicAtk, apprentice.id);
  abilityDocs.push(basicAtkDoc);
  appAbilityIds.push(basicAtkDoc._id);

  for (const ab of apprentice.apprenticeAbilities ?? []) {
    const doc = buildAbility(ab, apprentice.id);
    abilityDocs.push(doc);
    appAbilityIds.push(doc._id);
  }

  results.push({
    _id:  mkId(`job:${apprentice.id}`),
    name: classKey,               // "Stalwart", "Vagabond", etc.
    type: 'job',
    system: {
      jobType:     'apprentice',
      soul:        '',
      parentJobId: '',
      stats: {
        hp:       apprentice.hp,
        defense:  apprentice.defense,
        freeMove: apprentice.freeMove,
      },
      trait: {
        name:   apprentice.trait.name,
        effect: apprentice.trait.description,
      },
      basicAttack: {
        name:   basicAtk.name,
        cost:   basicAtk.cost,
        tags:   basicAtk.tags ?? [],
        effect: basicAtk.effect,
      },
      limitBreak:  { name: '', cost: '', tags: [], effect: '' },
      abilityIds:  appAbilityIds,
      talentIds:   [],
      keywords:    (apprentice.keywords ?? []).map(k => ({
        name:        k.name,
        description: k.description,
      })),
      description: '',
    },
  });

  // ── Advanced jobs ─────────────────────────────────────────────────────────
  for (const job of jobs) {
    const { soul = '', parentClass = classKey } = soulMap[job.id] ?? {};
    const advAbilityIds = [];
    const advTalentIds  = [];

    for (const ab of job.abilities ?? []) {
      const doc = buildAbility(ab, job.id);
      abilityDocs.push(doc);
      advAbilityIds.push(doc._id);
    }

    for (const t of job.talents ?? []) {
      const doc = buildTalent(t, job.id);
      talentDocs.push(doc);
      advTalentIds.push(doc._id);
    }

    const lb = job.limitBreak ?? {};
    const lbEffect = [lb.flavor, lb.effect].filter(Boolean).join('\n');

    const keywords = [];
    if (job.keyword) keywords.push({ name: job.keyword.name, description: job.keyword.description });

    results.push({
      _id:  mkId(`job:${job.id}`),
      name: job.id
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      type: 'job',
      system: {
        jobType:     'advanced',
        soul,
        parentJobId: apprentice.id,
        stats: {
          hp:       apprentice.hp,
          defense:  apprentice.defense,
          freeMove: apprentice.freeMove,
        },
        trait: {
          name:   job.trait.name,
          effect: job.trait.description,
        },
        basicAttack: {
          name:   basicAtk.name,
          cost:   basicAtk.cost,
          tags:   basicAtk.tags ?? [],
          effect: basicAtk.effect,
        },
        limitBreak: {
          name:   lb.name   ?? '',
          cost:   lb.cost   ?? '',
          tags:   lb.tags   ?? [],
          effect: lbEffect,
        },
        abilityIds:  advAbilityIds,
        talentIds:   advTalentIds,
        keywords,
        description: '',
      },
    });
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading source data…');

  const [
    bondsModule,
    combatJobsModule,
    stalwartModule,
    vagabondModule,
    mendicantModule,
    wrightModule,
    conditionsModule,
  ] = await Promise.all([
    loadTs(resolve(ICON_DATA, 'bonds.ts')),
    loadTs(resolve(ICON_DATA, 'combatJobs.ts')),
    loadTs(resolve(ICON_DATA, 'jobs/stalwart.ts')),
    loadTs(resolve(ICON_DATA, 'jobs/vagabond.ts')),
    loadTs(resolve(ICON_DATA, 'jobs/mendicant.ts')),
    loadTs(resolve(ICON_DATA, 'jobs/wright.ts')),
    import('../src/data/conditions.mjs'),
  ]);

  const { bonds }               = bondsModule;
  const { jobClasses }          = combatJobsModule;
  const { stalwartApprentice, stalwartJobs }   = stalwartModule;
  const { vagabondApprentice, vagabondJobs }   = vagabondModule;
  const { mendicantApprentice, mendicantJobs } = mendicantModule;
  const { wrightApprentice, wrightJobs }       = wrightModule;
  const { conditions }          = conditionsModule;

  // Build jobId → { soul, class } lookup from combatJobs data
  const soulMap = {};
  for (const cls of jobClasses) {
    for (const soul of cls.souls ?? []) {
      for (const job of soul.jobs ?? []) {
        soulMap[job.id] = { soul: soul.name, parentClass: cls.name };
      }
    }
  }

  // Clear output directories
  for (const pack of ['abilities', 'jobs', 'bonds', 'conditions']) {
    clearDir(packDir(pack));
  }

  // ── Conditions ──────────────────────────────────────────────────────────
  console.log(`Building conditions (${conditions.length})…`);
  for (const cond of conditions) {
    writeItem('conditions', buildCondition(cond));
  }

  // ── Bonds ────────────────────────────────────────────────────────────────
  console.log(`Building bonds (${bonds.length})…`);
  for (const bond of bonds) {
    writeItem('bonds', buildBond(bond));
  }

  // ── Jobs + abilities + talents ───────────────────────────────────────────
  const abilityDocs = [];
  const talentDocs  = [];

  const groups = [
    { apprentice: stalwartApprentice,  jobs: stalwartJobs,  classKey: 'Stalwart',  soulMap },
    { apprentice: vagabondApprentice,  jobs: vagabondJobs,  classKey: 'Vagabond',  soulMap },
    { apprentice: mendicantApprentice, jobs: mendicantJobs, classKey: 'Mendicant', soulMap },
    { apprentice: wrightApprentice,    jobs: wrightJobs,    classKey: 'Wright',    soulMap },
  ];

  let totalJobs = 0;
  for (const group of groups) {
    const jobDocs = buildJobGroup(group, abilityDocs, talentDocs);
    totalJobs += jobDocs.length;
    for (const doc of jobDocs) {
      writeItem('jobs', doc);
    }
  }

  console.log(`Building jobs (${totalJobs})…`);
  console.log(`Building abilities (${abilityDocs.length})…`);
  for (const doc of abilityDocs) {
    writeItem('abilities', doc);
  }

  // Talents go in the abilities pack (same compendium, different type)
  console.log(`Building talents (${talentDocs.length})…`);
  for (const doc of talentDocs) {
    writeItem('abilities', doc);
  }

  console.log('Done. Run `npm run pack` to compile to LevelDB.');
}

main().catch(err => { console.error(err); process.exit(1); });
