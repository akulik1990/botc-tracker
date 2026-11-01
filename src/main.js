(() => {
  const B = window.BVT;
  const db = B.db;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const ALPHA = [1, 0.8, 0.6, 0.4];
  const st = (id) => (db.panels[id] ||= { float: false, open: false, x: 0, y: 0, w: 360, h: 480 });
  // the tab strip rides on the docked panel's edge and the panel slides out from under it
  if (!db.dock) {
    const d = db.docked && typeof db.docked === "object" ? db.docked : { right: db.docked || "" };
    const id = d.right || d.left || "";
    const side = d.right || !d.left ? "right" : "left";
    db.dock = { side, id: id || "votes", open: !!id, w: db.dockW?.[side] || 380, y: -1 };
    delete db.docked; delete db.dockW; delete db.strip; delete db.open;
  }
  if (db.dock.id === "mine") db.dock.id = "info";
  const dock = db.dock;
  // innerWidth counts a classic scrollbar, and computeds can't see it change
  const vw = Vue.ref(document.documentElement.clientWidth);
  addEventListener("resize", () => { vw.value = document.documentElement.clientWidth; });

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
    data: () => ({ sizing: false }),
    computed: {
      list: () => B.PANELS, ui: () => B.ui, dock: () => dock,
      old() { return !!B.ui.view && B.game() !== B.latest(); },
      dockW: () => Math.min(dock.w, vw.value - 60),
      stripStyle() {
        const out = dock.open && !st(dock.id).float ? this.dockW : 0;
        return { [dock.side]: out + "px", top: dock.y < 0 ? "35%" : dock.y + "px" };
      },
    },
    methods: {
      st,
      here(id) { const s = st(id); return s.float ? s.open : dock.id === id; },
      on(id) { const s = st(id); return s.float ? s.open : dock.id === id && dock.open; },
      tab(id) {
        const s = st(id);
        if (s.float) { s.open = !s.open; if (s.open) this.front(id); }
        else if (dock.id === id) dock.open = !dock.open;
        else { dock.id = id; dock.open = true; }
      },
      close(id) { const s = st(id); if (s.float) s.open = false; else dock.open = false; },
      pop(id) {
        const s = st(id);
        s.float = !s.float;
        if (s.float) {
          if (dock.id === id) dock.open = false;
          if (!s.x && !s.y) {
            const k = Object.values(db.panels).filter((p) => p.float).length;
            s.x = clamp(innerWidth - 440 - 30 * k, 0, innerWidth - 200);
            s.y = 60 + 30 * k;
          }
          s.open = true;
          this.front(id);
        } else {
          s.open = false;
          dock.id = id;
          dock.open = true;
        }
      },
      flip() { dock.side = dock.side === "right" ? "left" : "right"; },
      fade(id) { const s = st(id); s.a = ALPHA[(ALPHA.indexOf(s.a ?? ALPHA[0]) + 1) % ALPHA.length]; },
      alpha(id) { return st(id).a ?? ALPHA[0]; },
      front(id) { const s = st(id); if (s.float && s.z !== B.ui.top) s.z = ++B.ui.top; },
      win(id) {
        const s = st(id), a = { "--a": this.alpha(id) };
        if (s.float) return { ...a, left: s.x + "px", top: s.y + "px", width: s.w + "px", height: s.h + "px", zIndex: s.z || 1 };
        const out = dock.open ? "none" : `translateX(${dock.side === "left" ? "-" : ""}100%)`;
        return { ...a, [dock.side]: "0", width: this.dockW + "px", transform: out };
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
      widen(e) {
        const move = (ev) => {
          const w = dock.side === "left" ? ev.clientX : vw.value - ev.clientX;
          dock.w = Math.round(clamp(w, 260, vw.value * 0.8));
        };
        const up = () => { this.sizing = false; removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
        this.sizing = true;
        addEventListener("pointermove", move);
        addEventListener("pointerup", up);
        e.preventDefault();
      },
      grip(e) {
        const el = e.currentTarget.parentElement;
        drag(e, () => [0, el.offsetTop], (x, y) => { dock.y = Math.min(y, innerHeight - el.offsetHeight); });
      },
    },
    template: `<div>
      <nav class="strip" :class="[dock.side, { sizing }]" :style="stripStyle">
        <span class="grip" @pointerdown="grip" title="Drag up or down">&#8942;&#8942;</span>
        <button v-for="p in list" :key="p.id" :class="{ on: on(p.id) }" @click="tab(p.id)">{{ p.label }}</button>
      </nav>
      <template v-for="p in list" :key="p.id">
        <section v-if="here(p.id)" class="win" :inert="!on(p.id)"
          :class="[st(p.id).float ? 'float' : 'dock ' + dock.side, { see: alpha(p.id) < 0.9, shut: !on(p.id) }]" :style="win(p.id)"
          @pointerdown="front(p.id)" @pointerup="size($event, p.id)">
          <div v-if="!st(p.id).float" class="edge" @pointerdown="widen" title="Drag to resize"></div>
          <header @pointerdown="move($event, p.id)">
            <b>{{ p.label }}</b><span class="sp"></span>
            <button v-if="ui.hl" class="hlchip" @click="ui.hl = ''" title="Clear highlight">{{ ui.hl }} &times;</button>
            <button class="pct" @click="fade(p.id)" title="Background opacity, click to change">{{ Math.round(alpha(p.id) * 100) }}%</button>
            <button v-if="!st(p.id).float" @click="flip" title="Move to the other side">{{ dock.side === 'right' ? '⇤' : '⇥' }}</button>
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
