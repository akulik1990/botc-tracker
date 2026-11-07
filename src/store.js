(() => {
  const B = window.BVT;
  const { reactive, watch } = Vue;
  const KEY = "botc-tracker";

  // keyed by player names other people pick, so no prototype to collide with
  const dict = (o) => Object.assign(Object.create(null), o);
  const MAPS = ["deaths", "chars", "tokens", "aligns", "log", "reads", "notes"];
  const blank = () => ({
    id: Date.now().toString(36), key: "", at: Date.now(), phase: 0, seq: 1,
    players: [], travellers: [], deaths: dict(), me: "", myChar: "", mine: "", chars: dict(), tokens: dict(), aligns: dict(),
    votes: [], log: dict(), reads: dict(), notes: dict(), eval: "", info: [], worlds: [],
  });

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
  const db = B.db = reactive(Object.assign({ games: [], panels: {} }, saved));
  if (!db.games.length) db.games.push(blank());
  for (const g of db.games) {
    for (const k of MAPS) g[k] = dict(g[k]);
    if (Object.keys(g.log).length || !g.claims) continue;
    for (const [n, id] of Object.entries(g.tokens || {})) if (id) g.log[n] = [{ id, src: "token", phase: 0 }];
    for (const [n, id] of Object.entries(g.claims)) if (id) (g.log[n] ||= []).push({ id, src: "set", phase: 0 });
    delete g.claims;
  }
  B.ui = reactive({ hl: "", view: "", ticks: [], compare: false, top: 10 });

  let timer = 0;
  watch(db, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }, 300);
  }, { deep: true });

  B.latest = () => db.games[db.games.length - 1];
  B.game = () => db.games.find((g) => g.id === B.ui.view) || B.latest();
  B.uid = (g) => String(g.seq++);
  // the character you set yourself wins over the game's token and over what you claim
  B.myChar = (g) => g.mine || g.myChar || B.claimOf(g, g.me).id;
  B.claimOf = (g, n) => g.log[n]?.at(-1) || { id: "", src: "" };
  B.addClaim = (g, n, id, src) => {
    const l = (g.log[n] ||= []);
    if ((l.at(-1)?.id || "") === id) return;
    l.push({ id, src, phase: g.phase });
  };

  B.newGame = () => {
    db.games.push(blank());
    if (db.games.length > 10) db.games.splice(0, db.games.length - 10);
    B.ui.view = "";
    B.ui.ticks = [];
    B.ui.compare = false;
  };

  const nameOf = (st, i) => {
    const p = st.players.players[i];
    if (!p) return "?";
    return st.session.users?.get?.(p.id)?.username || st.grimoire?.seats?.[i] || `Seat ${i + 1}`;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const set = (g, k, v) => { if (!same(g[k], v)) g[k] = v; };

  function sync(st) {
    const ps = st.players.players;
    const h0 = st.game.history?.[0];
    const key = h0?.type === "start" ? (st.session.sessionId || "") + "|" + h0.id : "";
    let g = B.latest();
    if (key && g.key && key !== g.key) { B.newGame(); g = B.latest(); }
    if (key && !g.key) g.key = key;
    g.phase = st.game.phase;
    if (!ps.length) return;

    const names = ps.map((p, i) => nameOf(st, i));
    set(g, "players", names);
    set(g, "travellers", names.filter((n, i) => ps[i].role?.team === "traveller"));
    const mi = ps.findIndex((p) => p.id && p.id === st.user?.user?.id);
    set(g, "me", mi < 0 ? "" : names[mi]);
    const mine = mi < 0 ? "" : ps[mi].role?.id || "";
    if (mine && mine !== g.myChar) B.addClaim(g, names[mi], mine, "me");
    set(g, "myChar", mine);
    const tokens = dict();
    ps.forEach((p, i) => {
      const id = p.role?.id;
      if (i === mi || !id) return;
      tokens[names[i]] = id;
      if (g.tokens[names[i]] !== id)
        B.addClaim(g, names[i], id, p.status.includes("revealed") ? "reveal" : p.role.team === "traveller" ? "public" : "token");
    });
    set(g, "tokens", tokens);

    // flipping a seat to good or evil in your grimoire, or putting a minion or demon on it, sets the read;
    // only on change, so a read set by hand stays until the board says something new
    ps.forEach((p, i) => {
      const n = names[i];
      if (i === mi) return;
      const al = p.alignment || (["minion", "demon"].includes(p.role?.team) ? "e" : "");
      if (al === (g.aligns[n] || "")) return;
      g.aligns[n] = al;
      if (al) g.reads[n] = al === "e" ? "evil" : "good";
    });

    if (st.roles?.size) {
      const chars = dict();
      // the character sheet shows the translated text when there is one, so use the same
      const t = (k, d) => B.gp?.$te?.(k) ? B.gp.$t(k) : d;
      for (const r of st.roles.values())
        chars[r.id] = { id: r.id, name: t(`roles.${r.id}.name`, r.name), team: r.team, ability: t(`roles.${r.id}.ability`, r.ability || ""), setup: !!r.setup, first: r.firstNight || 0, other: r.otherNight || 0 };
      set(g, "chars", chars);
    }

    const byId = (d) => typeof d === "number" ? names[d - 1] : names[ps.findIndex((p) => p.id === d)];
    const deaths = dict();
    let ph = 0, since = 0;
    const blocks = B.blocks(g.votes);
    for (const h of st.game.history || []) {
      if (h.type === "phase") { ph = h.data; since = +h.time || 0; }
      else if (h.type === "death" && byId(h.data)) {
        // marked players die when the phase changes, so night kills land at dawn and executions at dusk.
        // early in a day before any nomination means last night (an early Slayer shot gets this wrong),
        // early in a night for whoever was on the block means that day's execution
        const n = byId(h.data), t = +h.time || 0, early = ph > 1 && t - since < 5 * 60e3;
        const dawn = early && ph % 2 === 0 && !g.votes.some((v) => v.phase === ph && v.at < t);
        const dusk = early && ph % 2 === 1 && g.votes.some((v) => v.phase === ph - 1 && v.on === n && (blocks.has(v.id) || v.exile));
        deaths[n] = dawn || dusk ? ph - 1 : ph;
      }
      else if (h.type === "revive") delete deaths[byId(h.data)];
    }
    // no death logged (joined late, private entry): use when we first saw them dead
    ps.forEach((p, i) => {
      if (p.status.includes("dead") && !(names[i] in deaths)) deaths[names[i]] = g.deaths[names[i]] ?? g.phase;
      if (!p.status.includes("dead")) delete deaths[names[i]];
    });
    set(g, "deaths", deaths);
  }

  let live = null;
  function vote(st) {
    const v = st.vote, ps = st.players.players;
    if (!v.nomination) { live = null; return; }
    const [a, b] = v.nomination;
    const key = a + ">" + b;
    if (!live || live.key !== key) live = { key, id: Date.now().toString(36) };
    if (v.locked <= ps.length) return;
    const g = B.latest();
    const rec = {
      id: live.id, phase: st.game.phase, at: Date.now(),
      by: nameOf(st, a), on: nameOf(st, b),
      exile: ps[b]?.role?.team === "traveller",
      hidden: !!v.isHidden,
      first: (b + 1) % ps.length,
      seats: ps.map((p, i) => ({
        name: nameOf(st, i),
        dead: p.status.includes("dead"),
        spent: p.status.includes("voteless"),
        vote: +v.votes[i] || 0,
      })),
    };
    const i = g.votes.findIndex((x) => x.id === rec.id);
    if (i < 0) g.votes.push(rec); else g.votes[i] = rec;
  }

  B.hook = () => {
    const t = setInterval(() => {
      const gp = document.querySelector("#main")?.__vue_app__?.config.globalProperties;
      const store = gp?.$store;
      if (!store) return;
      clearInterval(t);
      B.store = store;
      B.gp = gp;
      store.subscribe((m, st) => {
        if (/^(game|players|session|user)\/|^set(CustomRoles|Edition|RolesAvailable)$/.test(m.type)) sync(st);
        if (m.type.startsWith("vote/")) vote(st);
      });
      sync(store.state);
      vote(store.state);
    }, 500);
  };
})();
