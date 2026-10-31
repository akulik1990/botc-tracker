(() => {
  const B = (window.BVT ||= {});

  const TABLE = {
    5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1], 8: [5, 1, 1, 1], 9: [5, 2, 1, 1],
    10: [7, 0, 2, 1], 11: [7, 1, 2, 1], 12: [7, 2, 2, 1], 13: [9, 0, 3, 1], 14: [9, 1, 3, 1], 15: [9, 2, 3, 1],
  };
  const MODS = { baron: [2], godfather: [-1, 1], fanggu: [1], vigormortis: [-1], balloonist: [1] };

  B.variants = (n, ids) => {
    if (n < 5) return [];
    const base = TABLE[Math.min(n, 15)];
    const out = [{ by: "", counts: base }];
    for (const id of ids) {
      for (const d of MODS[id] || []) {
        const [t, o, m, dm] = base;
        if (o + d < 0 || t - d < 0) continue;
        out.push({ by: id, counts: [t - d, o + d, m, dm] });
      }
    }
    return out;
  };
  B.counted = (id) => !!MODS[id];

  B.when = (ph) => !ph ? "Before the game" : ph % 2 ? `Night ${(ph + 1) / 2}` : `Day ${ph / 2}`;
  B.night = (ph) => Math.max(1, Math.ceil(ph / 2));
  B.short = (ph) => !ph ? "pre" : (ph % 2 ? "N" : "D") + Math.ceil(ph / 2);

  B.total = (x) => x.seats.reduce((s, p) => s + p.vote, 0);
  B.need = (x) => Math.ceil(x.seats.filter((p) => x.exile || !p.dead).length / 2);

  B.blocks = (vs) => {
    const days = new Map(), out = new Set();
    for (const x of vs) if (!x.exile && !x.hidden) days.set(x.phase, [...(days.get(x.phase) || []), x]);
    for (const xs of days.values()) {
      let top = null, tie = false;
      for (const x of xs) {
        const t = B.total(x);
        if (t < B.need(x)) continue;
        if (!top || t > B.total(top)) { top = x; tie = false; }
        else if (t === B.total(top)) tie = true;
      }
      if (top && !tie) out.add(top.id);
    }
    return out;
  };

  B.mark = (x, name) => {
    const p = x.seats.find((s) => s.name === name);
    if (!p) return "";
    if (x.hidden) return "?";
    if (p.vote) return p.dead && !x.exile ? "G" : "V";
    return p.dead && p.spent && !x.exile ? "-" : "N";
  };

  // a death logged in phase ph counts from that phase on; night n is phase 2n-1
  const deadAtNight = (g, name, n) => name in g.deaths && g.deaths[name] <= 2 * n - 1;

  B.executed = (g, day) => {
    const died = g.players.filter((n) => g.deaths[n] === 2 * day);
    if (died.length < 2) return died[0] || "";
    const on = g.votes.filter((x) => B.blocks(g.votes).has(x.id) && x.phase === 2 * day).map((x) => x.on);
    return died.find((n) => on.includes(n)) || "";
  };

  B.neighbours = (g, name, n) => {
    const ps = g.players, len = ps.length, i = ps.indexOf(name);
    if (i < 0) return [];
    const live = (p) => p !== name && !deadAtNight(g, p, n);
    let l = "", r = "";
    for (let k = 1; k < len && !l; k++) { const p = ps[(i - k + len) % len]; if (live(p)) l = p; }
    for (let k = 1; k < len && !r; k++) { const p = ps[(i + k) % len]; if (live(p)) r = p; }
    return l && l === r ? [l] : [l, r].filter(Boolean);
  };

  const GOOD = "townsfolk,outsider", EVIL = "minion,demon";
  B.FORMS = {
    washerwoman: { f: ["a", "b", "c"], team: "townsfolk" },
    librarian: { f: ["a", "b", "c"], team: "outsider", none: true },
    investigator: { f: ["a", "b", "c"], team: "minion" },
    chef: { f: ["num"] },
    empath: { f: ["num"] },
    fortuneteller: { f: ["a", "b", "yes"] },
    undertaker: { f: ["c"] },
    ravenkeeper: { f: ["a", "c"] },
    butler: { f: ["a"] },
    grandmother: { f: ["a", "c"], team: GOOD },
    clockmaker: { f: ["num"] },
    dreamer: { f: ["a", "c", "d"], team: GOOD, dteam: EVIL },
    oracle: { f: ["num"] },
    seamstress: { f: ["a", "b", "yes"], yes: ["same alignment", "different"] },
    sage: { f: ["a", "b"] },
    snakecharmer: { f: ["a"] },
    flowergirl: { f: ["yes"], yes: ["demon voted", "demon didn't vote"] },
    towncrier: { f: ["yes"], yes: ["a minion nominated", "no minion nominated"] },
    noble: { f: ["a", "b", "x"] },
    steward: { f: ["a"] },
    knight: { f: ["a", "b"] },
    shugenja: { f: ["dir"] },
    bountyhunter: { f: ["a"] },
    villageidiot: { f: ["a", "al"] },
  };

  const side = (team) => team === "demon" ? "demon" : team === "minion" ? "minion" : team ? "good" : null;
  const truth = (w, n) => w.demon === n ? "demon" : w.minions.includes(n) ? "minion" : "good";
  const ev = (w) => new Set([w.demon, ...w.minions].filter(Boolean));
  const ok = (b) => b ? "fit" : "break";
  const unset = (v) => v === "" || v == null;

  function chefPairs(ps, evil) {
    let n = 0;
    for (let i = 0; i < ps.length; i++) if (evil.has(ps[i]) && evil.has(ps[(i + 1) % ps.length])) n++;
    return ps.length < 2 ? 0 : n;
  }

  function clockSteps(ps, w) {
    const d = ps.indexOf(w.demon), len = ps.length;
    const ms = w.minions.map((m) => ps.indexOf(m)).filter((i) => i >= 0);
    if (d < 0 || !ms.length) return null;
    return Math.min(...ms.map((i) => Math.min(Math.abs(i - d), len - Math.abs(i - d))));
  }

  function nearest(ps, from, evil) {
    const i = ps.indexOf(from), len = ps.length;
    const walk = (step) => { for (let k = 1; k < len; k++) if (evil.has(ps[(i + step * k + len * k) % len])) return k; return Infinity; };
    const cw = walk(1), acw = walk(-1);
    return cw === acw ? "either" : cw < acw ? "clockwise" : "anticlockwise";
  }

  const dayVotes = (g, night) => g.votes.filter((x) => x.phase === 2 * (night - 1));

  function checkOne(e, w, g) {
    const evil = ev(w);
    const team = (c) => g.chars[c]?.team;
    switch (e.char) {
      case "washerwoman":
      case "librarian":
        if (!e.a || !e.b || !e.c) return null;
        return evil.has(e.a) && evil.has(e.b) ? "break" : "fit";
      case "investigator":
        if (!e.a || !e.b) return null;
        return ok(w.minions.includes(e.a) || w.minions.includes(e.b));
      case "chef":
        if (unset(e.num)) return null;
        return ok(chefPairs(g.players, evil) === Number(e.num));
      case "empath": {
        if (unset(e.num)) return null;
        return ok(B.neighbours(g, e.who, e.night).filter((n) => evil.has(n)).length === Number(e.num));
      }
      case "fortuneteller":
        if (!e.a || !e.b || e.yes == null) return null;
        if (w.demon === e.a || w.demon === e.b) return ok(e.yes);
        return e.yes ? "soft" : "fit";
      case "undertaker":
      case "ravenkeeper": {
        const t = e.char === "undertaker" ? B.executed(g, e.night - 1) : e.a;
        if (!t || !e.c || !team(e.c)) return null;
        return ok(truth(w, t) === side(team(e.c)));
      }
      case "grandmother":
      case "steward":
        return e.a ? ok(!evil.has(e.a)) : null;
      case "bountyhunter":
        return e.a ? ok(evil.has(e.a)) : null;
      case "clockmaker": {
        const n = clockSteps(g.players, w);
        return unset(e.num) || n == null ? null : ok(n === Number(e.num));
      }
      case "dreamer": {
        if (!e.a || !e.d || !team(e.d)) return null;
        const t = truth(w, e.a);
        return t === "good" ? "fit" : ok(side(team(e.d)) === t);
      }
      case "oracle": {
        if (unset(e.num)) return null;
        const dead = [...evil].filter((n) => n in g.deaths && g.deaths[n] <= 2 * e.night - 1).length;
        return ok(dead === Number(e.num));
      }
      case "seamstress":
        if (!e.a || !e.b || e.yes == null) return null;
        return ok((evil.has(e.a) === evil.has(e.b)) === e.yes);
      case "sage":
        if (!e.a || !e.b) return null;
        return ok(w.demon === e.a || w.demon === e.b);
      case "snakecharmer":
        return e.a ? ok(w.demon !== e.a) : null;
      case "knight":
        if (!e.a || !e.b) return null;
        return ok(w.demon !== e.a && w.demon !== e.b);
      case "noble": {
        if (!e.a || !e.b || !e.x) return null;
        return ok([e.a, e.b, e.x].filter((n) => evil.has(n)).length === 1);
      }
      case "villageidiot":
        if (!e.a || !e.al) return null;
        return ok(evil.has(e.a) === (e.al === "evil"));
      case "shugenja": {
        if (!e.dir) return null;
        const got = nearest(g.players, e.who, evil);
        return got === "either" || got === e.dir ? "fit" : "break";
      }
      case "flowergirl":
      case "towncrier": {
        const vs = dayVotes(g, e.night);
        if (e.yes == null || !vs.length || !w.demon) return null;
        const hit = e.char === "flowergirl"
          ? vs.some((x) => x.seats.some((p) => p.name === w.demon && p.vote))
          : vs.some((x) => w.minions.includes(x.by));
        return ok(hit === e.yes);
      }
    }
    return null;
  }

  B.checkWorld = (w, g) => {
    const rows = [];
    for (const e of g.info) {
      let s = checkOne(e, w, g);
      if (!s) continue;
      if (s === "break" && [e.who, e.a, e.b, e.x].some((n) => n && w.odd.includes(n))) s = "odd";
      rows.push({ id: e.id, s });
    }
    const notes = [];
    if (!w.demon) notes.push("no demon picked");
    const residents = g.players.filter((n) => !g.travellers.includes(n)).length;
    const counts = B.variants(residents, Object.keys(g.chars)).map((v) => v.counts[2]);
    if (counts.length && !counts.includes(w.minions.length))
      notes.push(`${w.minions.length} minion${w.minions.length === 1 ? "" : "s"}, the count says ${[...new Set(counts)].join(" or ")}`);
    const mine = g.chars[g.myChar]?.team;
    if (g.me && mine && side(mine) === "good" && ev(w).has(g.me)) notes.push("puts you on the evil team");
    const tally = { fit: 0, break: 0, odd: 0, soft: 0 };
    rows.forEach((r) => tally[r.s]++);
    return { rows, notes, tally };
  };
})();
