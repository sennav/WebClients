#!/usr/bin/env node
/**
 * Fork-only post-build step: patches the Firefox build's dist/manifest.json
 * for self-distributed ("unlisted") AMO signing of this personal fork.
 *
 * - sets browser_specific_settings.gecko.id (PERMANENT - do not change after install)
 * - sets the displayed name so the fork is distinguishable from the official add-on
 * - sets the version, auto-incrementing the patch segment on every run so AMO's
 *   "no version signed twice" rule is never violated (skips on failed signs are
 *   harmless - AMO only rejects duplicates)
 *
 * Run after the Firefox webpack build: `node tools/fork-manifest.mjs`
 * (add it to your rebuild command: build -> release.sh -> fork-manifest.mjs)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_MANIFEST = join(HERE, '..', 'dist', 'manifest.json');
const VERSION_STATE = join(HERE, '.fork-version');

/** PERMANENT: changing this after installation makes Firefox see a NEW extension
 * and all locally stored Proton Pass state (settings, local caches) is lost. */
const FORK_GECKO_ID = 'pass-extension@sennav.com';
const FORK_NAME = 'Proton Pass (sennav fork)';
const SEED_VERSION = '0.0.1';

const bumpPatch = (version) => {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] ?? -1) + 1;
    return parts.slice(0, 3).join('.');
};

const manifest = JSON.parse(readFileSync(DIST_MANIFEST, 'utf8'));

manifest.browser_specific_settings ??= {};
manifest.browser_specific_settings.gecko ??= {};
manifest.browser_specific_settings.gecko.id = FORK_GECKO_ID;
manifest.name = FORK_NAME;

const version = existsSync(VERSION_STATE) ? readFileSync(VERSION_STATE, 'utf8').trim() : SEED_VERSION;
manifest.version = version;

/* 2-space indent + trailing newline to match webpack's emitted formatting exactly */
writeFileSync(DIST_MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(VERSION_STATE, bumpPatch(version) + '\n');

console.log(`[fork-manifest] id:      ${FORK_GECKO_ID}`);
console.log(`[fork-manifest] name:    ${FORK_NAME}`);
console.log(`[fork-manifest] version: ${version} (next build will use ${bumpPatch(version)})`);
