(() => {
  const KEY = "vote-tracker";
  let db = { votes: [], open: false };
  try { db = { ...db, ...JSON.parse(localStorage.getItem(KEY)) }; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };

  const ui = { hl: "", ticks: new Set(), compare: false };
  let live = null, root = null;

  const nameOf = (st, i) => {
    const p = st.players.players[i];
    if (!p) return "?";
    return st.session.users?.get?.(p.id)?.username || st.grimoire?.seats?.[i] || `Seat ${i + 1}`;
  };

  function seen(st) {
    const v = st.vote, ps = st.players.players;
    if (!v.nomination) { live = null; return; }
    const [a, b] = v.nomination;
    const key = a + ">" + b;
    if (!live || live.key !== key) live = { key, id: Date.now().toString(36) };
    if (v.locked <= ps.length) return;

    // ponytail: a new game is spotted by a session change or the phase going back.
    // Two games in one lobby that both stop after day 1 merge; Clear covers that.
    const sess = st.session.sessionId || "";
    const last = db.votes[db.votes.length - 1];
    let game = last ? last.game : 1;
    if (last && (last.session !== sess || last.phase > st.game.phase)) game++;

    const rec = {
      id: live.id, game, session: sess, phase: st.game.phase, at: Date.now(),
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
    const i = db.votes.findIndex((x) => x.id === rec.id);
    if (i < 0) db.votes.push(rec);
    else { rec.game = db.votes[i].game; db.votes[i] = rec; }
    save();
    draw();
  }

  const total = (x) => x.seats.reduce((s, p) => s + p.vote, 0);
  const need = (x) => Math.ceil(x.seats.filter((p) => x.exile || !p.dead).length / 2);
  const when = (ph) => !ph ? "Before the game" : ph % 2 ? `Night ${(ph + 1) / 2}` : `Day ${ph / 2}`;
  const clock = (x) => x.seats.slice(x.first).concat(x.seats.slice(0, x.first));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  function blocks(vs) {
    const days = new Map(), out = new Set();
    for (const x of vs) if (!x.exile && !x.hidden) days.set(x.phase, [...(days.get(x.phase) || []), x]);
    for (const xs of days.values()) {
      let top = null, tie = false;
      for (const x of xs) {
        const t = total(x);
        if (t < need(x)) continue;
        if (!top || t > total(top)) { top = x; tie = false; }
        else if (t === total(top)) tie = true;
      }
      if (top && !tie) out.add(top.id);
    }
    return out;
  }

  function mark(x, name) {
    const p = x.seats.find((s) => s.name === name);
    if (!p) return "";
    if (x.hidden) return "?";
    if (p.vote) return p.dead && !x.exile ? "G" : "V";
    return p.dead && p.spent && !x.exile ? "-" : "N";
  }

  const nm = (n, cls = "nm") => `<span class="${cls}${ui.hl === n ? " hl" : ""}" data-name="${esc(n)}">${esc(n)}</span>`;

  function card(x, blk) {
    const t = total(x), ok = t >= need(x);
    const voters = clock(x).filter((p) => p.vote);
    const chips = x.hidden ? `<span class="small">secret vote</span>`
      : voters.length ? voters.map((p) => `<span class="chip${p.dead && !x.exile ? " g" : ""}${ui.hl === p.name ? " hl" : ""}" data-name="${esc(p.name)}">${esc(p.name)}${p.vote !== 1 ? ` ×${p.vote}` : ""}</span>`).join("")
      : `<span class="small">no votes</span>`;
    return `<div class="nom${x.seats.some((p) => p.name === ui.hl && p.vote) ? " lit" : ""}">
      <div class="row">
        <input type="checkbox" data-tick="${x.id}" ${ui.ticks.has(x.id) ? "checked" : ""}>
        ${nm(x.by)}<span class="small">&rarr;</span>${nm(x.on)}
        <span class="sp"></span>
        ${x.exile ? `<span class="tag">exile</span>` : ""}
        ${blk.has(x.id) ? `<span class="tag blk">on the block</span>` : ""}
        <span class="cnt ${x.hidden ? "" : ok ? "ok" : ""}">${x.hidden ? "?" : t}/${need(x)}</span>
        <button class="x" data-del="${x.id}" title="Delete">&times;</button>
      </div>
      <div class="chips">${chips}</div>
    </div>`;
  }

  function grid(vs) {
    const cols = vs.filter((x) => ui.ticks.has(x.id));
    if (!cols.length) return `<p class="small">Tick some votes first.</p>`;
    const names = [...new Set(cols.flatMap((x) => x.seats.map((p) => p.name)))];
    const head = cols.map((x) => `<th title="${esc(x.by)} → ${esc(x.on)}">${esc(when(x.phase).replace(/(\w)\w+ /, "$1"))}<br>${esc(x.on)}</th>`).join("");
    const rows = names.map((n) => {
      const ms = cols.map((x) => mark(x, n));
      const yes = ms.filter((m) => m === "V" || m === "G").length;
      const could = ms.filter((m) => m && m !== "-").length;
      return `<tr class="${ui.hl === n ? "hl" : ""}"><td>${nm(n)}</td>${ms.map((m) => `<td class="m${m}">${m === "-" ? "·" : m}</td>`).join("")}<td class="small">${yes}/${could}</td></tr>`;
    }).join("");
    return `<div class="gw"><table><tr><th></th>${head}<th></th></tr>${rows}</table></div>
      <p class="small">V voted, G ghost vote, N no, · dead with no vote left</p>`;
  }

  function draw() {
    if (!root) return;
    const g = Math.max(0, ...db.votes.map((x) => x.game));
    const vs = db.votes.filter((x) => x.game === g);
    const blk = blocks(vs);
    const days = [...new Set(vs.map((x) => x.phase))];
    root.querySelector(".tab").hidden = db.open;
    root.querySelector("aside").hidden = !db.open;
    root.querySelector("[data-act=compare]").textContent = ui.compare ? "List" : `Compare (${ui.ticks.size})`;
    root.querySelector(".hlbar").innerHTML = ui.hl ? `Highlighting <b>${esc(ui.hl)}</b> <button data-act="unhl">clear</button>` : "";
    root.querySelector(".body").innerHTML = !vs.length
      ? `<p class="small">No votes yet. Each vote is saved when the clock hand finishes going round.</p>`
      : ui.compare ? grid(vs)
      : days.map((d) => `<h3>${when(d)}</h3>` + vs.filter((x) => x.phase === d).map((x) => card(x, blk)).join("")).join("");
  }

  function click(e) {
    const el = e.target.closest("[data-act],[data-name],[data-del]");
    if (!el) return;
    if (el.dataset.name !== undefined) ui.hl = ui.hl === el.dataset.name ? "" : el.dataset.name;
    else if (el.dataset.del) {
      if (!confirm("Delete this vote?")) return;
      db.votes = db.votes.filter((x) => x.id !== el.dataset.del);
      ui.ticks.delete(el.dataset.del);
      save();
    } else {
      const act = el.dataset.act;
      if (act === "open" || act === "close") { db.open = act === "open"; save(); }
      if (act === "compare") ui.compare = !ui.compare;
      if (act === "unhl") ui.hl = "";
      if (act === "clear" && confirm("Clear every saved vote?")) { db.votes = []; ui.ticks.clear(); ui.compare = false; save(); }
    }
    draw();
  }

  function mount() {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;top:0;right:0;z-index:2147483000";
    document.body.append(host);
    root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style>
      <button class="tab" data-act="open">Votes</button>
      <aside hidden>
        <header><b>Votes</b><span class="sp"></span>
          <button data-act="compare"></button><button data-act="clear">Clear</button><button data-act="close">&times;</button>
        </header>
        <div class="hlbar"></div>
        <div class="body"></div>
      </aside>`;
    root.addEventListener("click", click);
    root.addEventListener("change", (e) => {
      const id = e.target.dataset.tick;
      if (!id) return;
      e.target.checked ? ui.ticks.add(id) : ui.ticks.delete(id);
      draw();
    });
    draw();
  }

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font: 13px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif; }
    button { background: #232732; color: #e6e8ec; border: 1px solid #2e3340; border-radius: 6px; padding: 3px 8px; cursor: pointer; }
    button:hover { border-color: #5b8def; }
    [hidden] { display: none !important; }
    .tab { position: fixed; top: 40%; right: 0; writing-mode: vertical-rl; padding: 10px 5px; border-radius: 6px 0 0 6px; }
    aside { position: fixed; top: 0; right: 0; width: min(360px, 100vw); height: 100vh; overflow-y: auto;
      background: rgba(20, 22, 26, .96); color: #e6e8ec; border-left: 1px solid #2e3340; padding: 8px 10px 20px; }
    header { display: flex; gap: 6px; align-items: center; position: sticky; top: -8px; background: #14161a; padding: 4px 0 6px; }
    header b { font-size: 15px; }
    .sp { flex: 1; }
    .hlbar:not(:empty) { margin: 4px 0; padding: 4px 6px; background: #3a3220; border-radius: 6px; }
    h3 { color: #8b93a3; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; margin: 12px 0 4px; }
    .nom { background: #1c1f26; border: 1px solid #2e3340; border-radius: 8px; padding: 6px 8px; margin-bottom: 6px; }
    .nom.lit { border-color: #d8b04a; }
    .row { display: flex; gap: 5px; align-items: center; }
    .nm { cursor: pointer; font-weight: 600; }
    .nm.hl, .chip.hl, .chip.hl.g { outline: 2px solid #d8b04a; }
    .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
    .chip { cursor: pointer; background: #232732; border: 1px solid #2e3340; border-radius: 10px; padding: 0 7px; }
    .chip.g { border-style: dashed; color: #b9c0cc; }
    .cnt { font-weight: 700; color: #8b93a3; }
    .cnt.ok { color: #3fbf5f; }
    .tag { font-size: 10px; font-weight: 700; padding: 0 5px; border-radius: 3px; border: 1px solid #2e3340; color: #8b93a3; }
    .tag.blk { color: #e0483f; border-color: #e0483f; }
    .x { padding: 0 6px; }
    .small { color: #8b93a3; font-size: 12px; }
    .gw { overflow-x: auto; }
    table { border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 3px 6px; border-bottom: 1px solid #2e3340; text-align: center; white-space: nowrap; }
    th { color: #8b93a3; font-size: 11px; font-weight: 600; }
    td:first-child { text-align: left; }
    tr.hl td { background: #3a3220; }
    .mV { color: #3fbf5f; font-weight: 700; }
    .mG { color: #b07ce8; font-weight: 700; }
    .mN { color: #8b93a3; }
    .m- { color: #4a5060; }
  `;

  mount();
  const t = setInterval(() => {
    const store = document.querySelector("#main")?.__vue_app__?.config.globalProperties.$store;
    if (!store) return;
    clearInterval(t);
    store.subscribe((m, st) => m.type.startsWith("vote/") && seen(st));
    seen(store.state);
  }, 500);
})();
