// demo/shell/patch-names.mjs: the patch names each instrument type offers, read off the
// instrument's own module, so a `patch` transform (bay.mjs) and a model's port label share one list.

import { SAMPLER_SET } from '/code/sampler.mjs';
import { PATCHES } from './plaits-params.mjs';

/** Catalogue type to patch names. The Pi's sampler plays the same programs (rig/board/scsampler.mjs SETS 0 and 1). */
export const PATCH_NAMES = {
  sampler: SAMPLER_SET.map((i) => i.name),
  plaits: PATCHES.map((p) => p.name),
};

/** The program number a sampler patch name is, or null. */
export const samplerProgram = (name) => SAMPLER_SET.find((i) => i.name === name)?.program ?? null;

/** A midi-in's label with its patches in it, so a model reading the label knows them. */
export const withPatches = (label, names) => (names?.length ? `${label} (patches: ${names.join(', ')})` : label);
