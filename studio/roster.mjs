// ===========================================================================
// studio/roster.mjs — THE ROSTER ADAPTER (plan-studio §5's missing piece).
//
// A roster is a FOLD over an ordered prefix, not a snapshot that gets patched.
// The room DO sends exactly ONE `roster` snapshot — to the joiner, at join —
// and nothing but deltas after that (`joined` / `left` / `promote` / `demote` /
// `published` / `unpublished` / `perm`). Anything that keeps a private copy and
// mutates it is holding page state, which is the thing plan-studio §5 forbids
// the strip from reading. The honest representation is the row sequence plus a
// reducer, and the SAME reducer answers the question the grid replay has to ask
// — "who was on screen, in which tier, at 19:42:07.3" — which a patched copy
// can never answer at all.
//
// Plain ESM, no imports: node (studio/engine.mjs) and the browser (the grid
// replay page) load the identical file, so the live roster and the replayed
// roster cannot drift apart. It satisfies timeline/transport.mjs's adapter
// contract: {caps, actuate, reduce, assertState}.
//
// Row payload shapes (kind: 'roster'), all carrying `at` = wall ms:
//   {op:'snapshot', participants:[…], perm}   the joiner's one snapshot
//   {op:'join',     p:{id,name,role,tier,…}}
//   {op:'left',     id}
//   {op:'tier',     id, tier, by}             promote/demote are one op
//   {op:'publish',  id, sessionId, trackNames}
//   {op:'unpublish',id, trackNames|null}      null = every track
//   {op:'perm',     grant:{role?,participantId?,publish}, by}
//   {op:'liveness', id, state:'live'|'stalled'|'unknown', tileAgeMs}
// ===========================================================================

export const TIERS = ["wall", "live", "featured"];
export const ROLES = ["performer", "audience", "operator"];

/** Apply ONE delta to a roster map, in place. The only mutation point. */
export function rosterApply(m, p) {
  if (!p || !p.op) return m;
  const get = (id) => m.get(id);
  switch (p.op) {
    case "snapshot":
      m.clear();
      for (const x of p.participants || []) m.set(x.id, { ...x, liveness: "unknown" });
      if (p.perm) m.set("__perm", { id: "__perm", perm: p.perm });
      break;
    case "join":
      if (p.p && p.p.id) m.set(p.p.id, { ...p.p, liveness: "unknown", joinedAt: p.p.joinedAt || p.at });
      break;
    case "left":
      // The DO's `left` IS the death detector (38–126 ms vs the SFU's 31–47 s
      // session 410). A departure is a removal, not a flag: absence is content.
      m.delete(p.id);
      break;
    case "tier": {
      const e = get(p.id); if (e) { e.tier = p.tier; e.tierAt = p.at; e.tierBy = p.by || null; }
      break;
    }
    case "publish": {
      const e = get(p.id);
      if (e) { e.publishing = true; e.sessionId = p.sessionId || null;
               e.trackNames = p.trackNames || []; e.publishAt = p.at; }
      break;
    }
    case "unpublish": {
      const e = get(p.id);
      if (e) {
        e.trackNames = p.trackNames
          ? (e.trackNames || []).filter((t) => !p.trackNames.includes(t)) : [];
        e.publishing = e.trackNames.length > 0;
        e.unpublishAt = p.at;
      }
      break;
    }
    case "perm": {
      const cur = (m.get("__perm") || { id: "__perm", perm: { publish: {} } }).perm;
      const pub = { ...(cur.publish || {}) };
      const g = p.grant || {};
      // The DO's own resolution order, mirrored so the console shows what the
      // room will actually do: per-participant → per-role → OPEN.
      if (g.participantId) pub[g.participantId] = g.publish;
      else if (g.role) pub[g.role] = g.publish;
      else pub.audience = g.publish;                 // the DO's default target
      m.set("__perm", { id: "__perm", perm: { publish: pub }, permAt: p.at, permBy: p.by || null });
      break;
    }
    case "liveness": {
      const e = get(p.id);
      if (e) { e.liveness = p.state; e.tileAgeMs = p.tileAgeMs ?? null; e.livenessAt = p.at; }
      break;
    }
    default: break;                                   // unknown op: round-trip, ignore
  }
  return m;
}

/** Fold a complete ordered prefix into a roster map. */
export function foldRoster(payloads) {
  const m = new Map();
  for (const p of payloads || []) rosterApply(m, p);
  return m;
}

/** The roster map as a stable, sorted, JSON-able array + the perm window.
 *  Sort: featured → live → wall, then by join time, so the console's list does
 *  not jump around when an unrelated participant changes tier. */
export function rosterView(m) {
  const perm = (m.get("__perm") || {}).perm || { publish: {} };
  const list = [...m.values()].filter((x) => x.id !== "__perm");
  const rank = (t) => (t === "featured" ? 0 : t === "live" ? 1 : 2);
  list.sort((a, b) => rank(a.tier) - rank(b.tier) || (a.joinedAt || 0) - (b.joinedAt || 0));
  const allowed = (p) =>
    perm.publish[p.id] != null ? perm.publish[p.id]
      : (perm.publish[p.role] != null ? perm.publish[p.role] : true);
  return {
    participants: list.map((p) => ({ ...p, mayPublish: allowed(p) })),
    perm, counts: {
      total: list.length,
      featured: list.filter((p) => p.tier === "featured").length,
      live: list.filter((p) => p.tier === "live").length,
      wall: list.filter((p) => p.tier === "wall").length,
      publishing: list.filter((p) => p.publishing).length,
      stalled: list.filter((p) => p.liveness === "stalled").length,
    },
  };
}

/** The adapter. `onState` is the live projection sink (the engine's status). */
export function makeRosterAdapter(onState) {
  let live = new Map();
  return {
    caps: { kind: "roster", domain: "wall", unit: "ms", seekable: true,
            reducible: true, catchUp: "reduce" },
    actuate(p) { rosterApply(live, p); onState && onState(live); },
    reduce(payloads) { return foldRoster(payloads); },
    assertState(state) {
      live = state instanceof Map ? state : new Map();
      onState && onState(live);
    },
    // escape hatch for a host that needs the current fold without the deck
    current: () => live,
  };
}
