(() => {
  const B = window.BVT;
  const db = B.db;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const ALPHA = [1, 0.8, 0.6, 0.4];
  const st = (id) => (db.panels[id] ||= { float: false, open: false, x: 0, y: 0, w: 360, h: 480 });
  db.strip ||= { x: -1, y: -1 };
  if (typeof db.docked !== "object" || !db.docked) db.docked = { left: "", right: db.docked || "" };
  db.dockW ||= { left: 380, right: 380 };
  const side = (id) => st(id).side || "right";

  function drag(e, get, put) {
    if (e.button !== 0 || e.target.closest("button,select,input,textarea")) return;
    const [x0, y0] = get(), dx = e.clientX - x0, dy = e.clientY - y0;
    const move = (ev) => put(clamp(ev.clientX - dx, 0, innerWidth - 40), clamp(ev.clientY - dy, 0, innerHeight - 30));
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    e.preventDefault();
  }

  const App = {
    computed: {
      list: () => B.PANELS, ui: () => B.ui, db: () => db,
      old() { return !!B.ui.view && B.game() !== B.latest(); },
      stripStyle() {
        const s = db.strip;
        return s.x < 0 ? { right: "0", top: "35%" } : { left: s.x + "px", top: s.y + "px" };
      },
      off() { return db.strip.x < 0 ? 34 : 0; },
    },
    methods: {
      st, side,
      shown(id) { const s = st(id); return s.float ? s.open : db.docked[side(id)] === id; },
      tab(id) {
        const s = st(id), d = side(id);
        if (s.float) { s.open = !s.open; if (s.open) this.front(id); }
        else db.docked[d] = db.docked[d] === id ? "" : id;
      },
      close(id) { const s = st(id); if (s.float) s.open = false; else db.docked[side(id)] = ""; },
      pop(id) {
        const s = st(id);
        s.float = !s.float;
        if (s.float) {
          if (db.docked[side(id)] === id) db.docked[side(id)] = "";
          if (!s.x && !s.y) {
            const k = Object.values(db.panels).filter((p) => p.float).length;
            s.x = clamp(innerWidth - 440 - 30 * k, 0, innerWidth - 200);
            s.y = 60 + 30 * k;
          }
          s.open = true;
          this.front(id);
        } else {
          s.open = false;
          db.docked[side(id)] = id;
        }
      },
      flip(id) {
        const s = st(id), from = side(id), to = from === "right" ? "left" : "right";
        if (db.docked[from] === id) db.docked[from] = "";
        s.side = to;
        db.docked[to] = id;
      },
      fade(id) { const s = st(id); s.a = ALPHA[(ALPHA.indexOf(s.a ?? ALPHA[0]) + 1) % ALPHA.length]; },
      alpha(id) { return st(id).a ?? ALPHA[0]; },
      front(id) { const s = st(id); if (s.float && s.z !== B.ui.top) s.z = ++B.ui.top; },
      win(id) {
        const s = st(id), a = { "--a": this.alpha(id) };
        if (s.float) return { ...a, left: s.x + "px", top: s.y + "px", width: s.w + "px", height: s.h + "px", zIndex: s.z || 1 };
        const d = side(id), w = Math.min(db.dockW[d], innerWidth) + "px";
        return d === "left" ? { ...a, left: "0", width: w } : { ...a, right: this.off + "px", width: w };
      },
      move(e, id) {
        const s = st(id);
        if (s.float) drag(e, () => [s.x, s.y], (x, y) => { s.x = x; s.y = y; });
      },
      size(e, id) {
        const s = st(id);
        if (!s.float) return;
        s.w = e.currentTarget.offsetWidth;
        s.h = e.currentTarget.offsetHeight;
      },
      widen(e, id) {
        const d = side(id), off = this.off;
        const move = (ev) => {
          const w = d === "left" ? ev.clientX : innerWidth - off - ev.clientX;
          db.dockW[d] = Math.round(clamp(w, 260, innerWidth * 0.8));
        };
        const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
        addEventListener("pointermove", move);
        addEventListener("pointerup", up);
        e.preventDefault();
      },
      grip(e) {
        const el = e.currentTarget.parentElement, s = db.strip;
        drag(e, () => [el.offsetLeft, el.offsetTop], (x, y) => { s.x = x; s.y = y; });
      },
    },
    template: `<div>
      <nav class="strip" :style="stripStyle">
        <span class="grip" @pointerdown="grip" title="Drag to move">&#8942;&#8942;</span>
        <button v-for="p in list" :key="p.id" :class="{ on: shown(p.id) }" @click="tab(p.id)">{{ p.label }}</button>
      </nav>
      <template v-for="p in list" :key="p.id">
        <section v-if="shown(p.id)" class="win" :class="[st(p.id).float ? 'float' : 'dock ' + side(p.id), { see: alpha(p.id) < 0.9 }]" :style="win(p.id)"
          @pointerdown="front(p.id)" @pointerup="size($event, p.id)">
          <div v-if="!st(p.id).float" class="edge" @pointerdown="widen($event, p.id)" title="Drag to resize"></div>
          <header @pointerdown="move($event, p.id)">
            <b>{{ p.label }}</b><span class="sp"></span>
            <button v-if="ui.hl" class="hlchip" @click="ui.hl = ''" title="Clear highlight">{{ ui.hl }} &times;</button>
            <button class="pct" @click="fade(p.id)" title="Background opacity, click to change">{{ Math.round(alpha(p.id) * 100) }}%</button>
            <button v-if="!st(p.id).float" @click="flip(p.id)" title="Dock on the other side">{{ side(p.id) === 'right' ? '⇤' : '⇥' }}</button>
            <button @click="pop(p.id)">{{ st(p.id).float ? 'Dock' : 'Pop out' }}</button>
            <button @click="close(p.id)">&times;</button>
          </header>
          <div v-if="old" class="old">Earlier game <button @click="ui.view = ''">back to current</button></div>
          <div class="body"><component :is="p.comp" /></div>
        </section>
      </template>
    </div>`,
  };

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483000";
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = B.CSS;
  const mount = document.createElement("div");
  root.append(style, mount);
  Vue.createApp(App).mount(mount);
  B.hook();
})();
