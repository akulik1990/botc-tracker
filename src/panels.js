(() => {
  const B = window.BVT;
  const TEAMS = [["townsfolk", "Townsfolk"], ["outsider", "Outsiders"], ["minion", "Minions"], ["demon", "Demons"], ["traveller", "Travellers"]];
  const base = { computed: { g: () => B.game(), ui: () => B.ui } };
  const ask = (msg) => confirm(msg);

  const Nm = {
    props: { n: String, cls: { type: String, default: "nm" } },
    computed: { ui: () => B.ui },
    methods: { flip() { B.ui.hl = B.ui.hl === this.n ? "" : this.n; } },
    template: `<span :class="[cls, { hl: ui.hl === n }]" @click.stop="flip"><slot>{{ n }}</slot></span>`,
  };

  const CharSelect = {
    mixins: [base],
    props: { modelValue: String, only: String, none: String, blank: { type: String, default: "-" } },
    emits: ["update:modelValue"],
    computed: {
      groups() {
        const cs = Object.values(this.g.chars);
        return TEAMS.filter(([t]) => !this.only || this.only.split(",").includes(t))
          .map(([t, label]) => ({ label, list: cs.filter((c) => c.team === t) }))
          .filter((x) => x.list.length);
      },
    },
    template: `<select :value="modelValue || ''" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">{{ blank }}</option>
      <option v-if="none" value="none">{{ none }}</option>
      <optgroup v-for="x in groups" :key="x.label" :label="x.label">
        <option v-for="c in x.list" :key="c.id" :value="c.id" :title="c.ability">{{ c.name }}</option>
      </optgroup>
    </select>`,
  };

  const PlayerSelect = {
    mixins: [base],
    props: { modelValue: String, blank: { type: String, default: "-" }, skip: { type: Array, default: () => [] } },
    emits: ["update:modelValue"],
    template: `<select :value="modelValue || ''" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">{{ blank }}</option>
      <option v-for="n in g.players.filter((n) => !skip.includes(n))" :key="n" :value="n">{{ n }}</option>
    </select>`,
  };

  const PlayerChips = {
    props: { modelValue: Array, cls: { type: String, default: "" } },
    emits: ["update:modelValue"],
    components: { PlayerSelect },
    methods: {
      add(n) { if (n && !this.modelValue.includes(n)) this.$emit("update:modelValue", [...this.modelValue, n]); },
      del(n) { this.$emit("update:modelValue", this.modelValue.filter((x) => x !== n)); },
    },
    template: `<span class="chips">
      <span v-for="n in modelValue" :key="n" class="chip" :class="cls">{{ n }}<button class="x" @click="del(n)">&times;</button></span>
      <PlayerSelect :modelValue="''" blank="+ add" :skip="modelValue" @update:modelValue="add" />
    </span>`,
  };

  const charName = (g, id) => g.chars[id]?.name || "";
  const infoText = (g, e) => {
    const c = e.c === "none" ? "no one" : charName(g, e.c) || "?";
    switch (e.char) {
      case "washerwoman": case "librarian": case "investigator":
        return e.c === "none" ? "no Outsiders in play" : `${e.a || "?"} or ${e.b || "?"} is the ${c}`;
      case "chef": return `${e.num} pair${e.num == 1 ? "" : "s"}`;
      case "empath": return `${e.num} evil neighbour${e.num == 1 ? "" : "s"}`;
      case "fortuneteller": return `${e.a} and ${e.b}: ${e.yes ? "yes" : "no"}`;
      case "undertaker": return `executed player was the ${c}`;
      case "ravenkeeper": return `${e.a} is the ${c}`;
      case "butler": return `master is ${e.a}`;
      case "grandmother": return `${e.a} is the ${c}`;
      case "clockmaker": return `${e.num} step${e.num == 1 ? "" : "s"} from demon to minion`;
      case "dreamer": return `${e.a} is the ${c} or the ${charName(g, e.d) || "?"}`;
      case "oracle": return `${e.num} dead evil`;
      case "seamstress": return `${e.a} and ${e.b}: ${e.yes ? "same" : "different"} alignment`;
      case "sage": return `demon is ${e.a} or ${e.b}`;
      case "snakecharmer": return `charmed ${e.a}, no swap`;
      case "flowergirl": return e.yes ? "demon voted" : "demon didn't vote";
      case "towncrier": return e.yes ? "a minion nominated" : "no minion nominated";
      case "noble": return `one of ${e.a}, ${e.b}, ${e.x} is evil`;
      case "steward": return `${e.a} is good`;
      case "knight": return `${e.a} and ${e.b} aren't the demon`;
      case "shugenja": return `nearest evil is ${e.dir}`;
      case "bountyhunter": return `${e.a} is evil`;
      case "villageidiot": return `${e.a} is ${e.al}`;
    }
    return e.text || "";
  };

  const Votes = {
    mixins: [base],
    components: { Nm },
    computed: {
      blk() { return B.blocks(this.g.votes); },
      days() { return [...new Set(this.g.votes.map((x) => x.phase))]; },
      cols() { return this.g.votes.filter((x) => this.ui.ticks.includes(x.id)); },
      names() { return [...new Set(this.cols.flatMap((x) => x.seats.map((p) => p.name)))]; },
    },
    methods: {
      when: B.when, total: B.total, need: B.need, mark: B.mark,
      voters: (x) => x.seats.slice(x.first).concat(x.seats.slice(0, x.first)).filter((p) => p.vote),
      lit(x) { return x.seats.some((p) => p.name === this.ui.hl && p.vote); },
      tick(id) { const t = this.ui.ticks; t.includes(id) ? t.splice(t.indexOf(id), 1) : t.push(id); },
      del(x) { if (ask("Delete this vote?")) this.g.votes.splice(this.g.votes.indexOf(x), 1); },
      short: B.short,
      row(n) {
        const ms = this.cols.map((x) => B.mark(x, n));
        return { ms, yes: ms.filter((m) => m === "V" || m === "G").length, could: ms.filter((m) => m && m !== "-").length };
      },
    },
    template: `<div>
      <div class="row bar">
        <button @click="ui.compare = !ui.compare" :disabled="!g.votes.length">{{ ui.compare ? 'List' : 'Compare (' + ui.ticks.length + ')' }}</button>
        <button v-if="ui.ticks.length" @click="ui.ticks = []">Untick</button>
      </div>
      <p v-if="!g.votes.length" class="small">No votes yet. Each vote is saved when the clock hand finishes going round.</p>
      <template v-else-if="ui.compare">
        <p v-if="!cols.length" class="small">Tick some votes first.</p>
        <template v-else>
          <div class="gw"><table>
            <tr><th></th><th v-for="x in cols" :key="x.id" :title="x.by + ' → ' + x.on">{{ short(x.phase) }}<br>{{ x.on }}</th><th></th></tr>
            <tr v-for="n in names" :key="n" :class="{ hl: ui.hl === n }">
              <td><Nm :n="n" /></td>
              <td v-for="(m, i) in row(n).ms" :key="i" :class="'m' + m">{{ m === '-' ? '·' : m }}</td>
              <td class="small">{{ row(n).yes }}/{{ row(n).could }}</td>
            </tr>
          </table></div>
          <p class="small">V voted, G ghost vote, N no, · dead with no vote left</p>
        </template>
      </template>
      <template v-else><template v-for="d in days" :key="d">
        <h3>{{ when(d) }}</h3>
        <div v-for="x in g.votes.filter((v) => v.phase === d)" :key="x.id" class="card" :class="{ lit: lit(x) }">
          <div class="row">
            <input type="checkbox" :checked="ui.ticks.includes(x.id)" @change="tick(x.id)">
            <Nm :n="x.by" /><span class="small">&rarr;</span><Nm :n="x.on" />
            <span class="sp"></span>
            <span v-if="x.exile" class="tag">exile</span>
            <span v-if="blk.has(x.id)" class="tag blk">on the block</span>
            <span class="cnt" :class="{ ok: !x.hidden && total(x) >= need(x) }">{{ x.hidden ? '?' : total(x) }}/{{ need(x) }}</span>
            <button class="x" @click="del(x)" title="Delete">&times;</button>
          </div>
          <div class="chips">
            <span v-if="x.hidden" class="small">secret vote</span>
            <span v-else-if="!voters(x).length" class="small">no votes</span>
            <template v-else><Nm v-for="p in voters(x)" :key="p.name" :n="p.name" :cls="'chip' + (p.dead && !x.exile ? ' g' : '')">{{ p.name }}{{ p.vote !== 1 ? ' ×' + p.vote : '' }}</Nm></template>
          </div>
        </div>
      </template></template>
    </div>`,
  };

  const READS = ["", "good", "evil"];
  const Players = {
    mixins: [base],
    components: { Nm, CharSelect },
    methods: {
      cycle(n) { this.g.reads[n] = READS[(READS.indexOf(this.g.reads[n] || "") + 1) % READS.length]; },
      cur(n) { return B.claimOf(this.g, n); },
      pick(n, id) { B.addClaim(this.g, n, id, "set"); },
      hist(n) { return this.g.log[n] || []; },
      showHist(n) { const h = this.hist(n); return h.length > 1 || (h.length && h[0].src !== "set"); },
      drop(n, i) { this.g.log[n].splice(i, 1); },
      cname(id) { return charName(this.g, id) || "no claim"; },
      src: (s) => ({ token: " token", me: " yours", reveal: " revealed", public: "" })[s] || "",
      short: B.short,
    },
    template: `<div>
      <textarea v-model="g.eval" rows="3" placeholder="Notes for this game"></textarea>
      <p v-if="!g.players.length" class="small">Seats show up here once you're in a game.</p>
      <div v-for="(n, i) in g.players" :key="n" class="prow" :class="{ hl: ui.hl === n, dead: n in g.deaths }">
        <div class="row">
          <span class="seat">{{ i + 1 }}</span>
          <Nm :n="n" />
          <span v-if="n === g.me" class="tag">you</span>
          <span v-if="g.travellers.includes(n)" class="tag">traveller</span>
          <span v-if="n in g.deaths" class="small">&dagger;</span>
          <span class="sp"></span>
          <button class="read" :class="g.reads[n]" @click="cycle(n)" :title="'Read: ' + (g.reads[n] || 'none')">{{ (g.reads[n] || '?')[0].toUpperCase() }}</button>
          <CharSelect :modelValue="cur(n).id" @update:modelValue="pick(n, $event)" blank="claim" :class="{ tok: cur(n).src === 'token' }" />
        </div>
        <div v-if="showHist(n)" class="hist">
          <span v-for="(c, k) in hist(n)" :key="k" :class="{ was: k < hist(n).length - 1 }">{{ cname(c.id) }}
            <small>{{ short(c.phase) }}{{ src(c.src) }}</small><button class="x" @click="drop(n, k)" title="Remove">&times;</button></span>
        </div>
        <input v-model="g.notes[n]" class="note" placeholder="note">
      </div>
    </div>`,
  };

  const Claims = {
    mixins: [base],
    components: { Nm },
    data: () => ({ shown: "" }),
    computed: {
      claimOf() { return (n) => B.claimOf(this.g, n).id; },
      residents() { return this.g.players.filter((n) => !this.g.travellers.includes(n)); },
      opts() { return B.variants(this.residents.length, Object.keys(this.g.chars)); },
      other() { return Object.values(this.g.chars).filter((c) => c.setup && !B.counted(c.id) && !["drunk", "marionette"].includes(c.id)).map((c) => c.name); },
      open() { return this.residents.filter((n) => !this.claimOf(n)); },
      groups() {
        const cs = Object.values(this.g.chars);
        return TEAMS.map(([t, label]) => ({
          label,
          list: cs.filter((c) => c.team === t).map((c) => ({
            c,
            by: this.g.players.filter((n) => this.claimOf(n) === c.id),
            was: this.g.players.filter((n) => this.claimOf(n) !== c.id && (this.g.log[n] || []).some((x) => x.id === c.id)),
          })),
        })).filter((x) => x.list.length);
      },
    },
    methods: {
      by(o) { return o.by ? " with " + charName(this.g, o.by) : ""; },
      flip(id) { this.shown = this.shown === id ? "" : id; },
      tok(n) { return B.claimOf(this.g, n).src === "token"; },
    },
    template: `<div>
      <p v-if="!Object.keys(g.chars).length" class="small">The script's characters load once you're in a game.</p>
      <div v-for="o in opts" :key="o.by" class="small">{{ o.counts[0] }} Townsfolk, {{ o.counts[1] }} Outsider{{ o.counts[1] === 1 ? '' : 's' }}, {{ o.counts[2] }} Minion{{ o.counts[2] === 1 ? '' : 's' }}, {{ o.counts[3] }} Demon{{ by(o) }}</div>
      <div v-if="other.length" class="small">Also changes the setup: {{ other.join(', ') }}</div>
      <div v-if="open.length" class="small mt">No claim yet: <Nm v-for="n in open" :key="n" :n="n" cls="nm soft" /></div>
      <div v-for="x in groups" :key="x.label">
        <h3>{{ x.label }}</h3>
        <template v-for="o in x.list" :key="o.c.id">
          <div class="claim" :class="['t-' + o.c.team, { none: !o.by.length, twice: o.by.length > 1 }]" @click="flip(o.c.id)">
            <span>{{ o.c.name }}</span><span class="sp"></span><Nm v-for="n in o.was" :key="'w' + n" :n="n" cls="nm who was" /><Nm v-for="n in o.by" :key="n" :n="n" :cls="'nm who' + (tok(n) ? ' tok' : '')" />
          </div>
          <div v-if="shown === o.c.id" class="ability">{{ o.c.ability }}</div>
        </template>
      </div>
    </div>`,
  };

  const fresh = () => ({ who: "", char: "", night: "", a: "", b: "", x: "", c: "", d: "", num: "", yes: null, dir: "", al: "", text: "" });
  const Info = {
    mixins: [base],
    components: { CharSelect, PlayerSelect, Nm },
    props: { mine: Boolean },
    data() { return { e: this.start(), filter: "" }; },
    computed: {
      form() { return B.FORMS[this.e.char] || { f: ["text"] }; },
      list() {
        const keep = this.mine ? (e) => e.who === this.g.me : (e) => !this.filter || [e.who, e.a, e.b, e.x].includes(this.filter);
        return this.g.info.filter(keep).sort((x, y) => x.night - y.night);
      },
      night() { return B.night(this.g.phase); },
      myId() { return B.claimOf(this.g, this.g.me).id; },
    },
    watch: {
      "e.who"(n) {
        const c = B.claimOf(this.g, n).id;
        if (c) this.e.char = c;
      },
      myId() { if (this.mine) this.e = this.start(); },
      "g.me"() { if (this.mine) this.e = this.start(); },
    },
    methods: {
      has(k) { return this.form.f.includes(k); },
      add() {
        if (!this.e.who || !this.e.char) return;
        const e = { ...this.e, id: B.uid(this.g), night: this.e.night || this.night };
        if (e.num !== "") e.num = Number(e.num);
        this.g.info.push(e);
        this.e = { ...this.start(), night: this.e.night };
      },
      start() {
        const g = B.game();
        return this.mine ? { ...fresh(), who: g.me, char: B.claimOf(g, g.me).id } : fresh();
      },
      drop(e) { if (ask("Delete this info?")) this.g.info.splice(this.g.info.indexOf(e), 1); },
      text(e) { return infoText(this.g, e); },
      name(id) { return charName(this.g, id); },
      team(id) { return this.g.chars[id]?.team || ""; },
    },
    template: `<div>
      <template v-if="mine">
        <p v-if="!g.me" class="small">Take a seat in a game to log your own info here.</p>
        <div v-else class="me">
          <b :class="'t-' + team(myId)">{{ name(myId) || 'Your character' }}</b>
          <div class="ability">{{ g.chars[myId]?.ability }}</div>
        </div>
      </template>
      <div class="form">
        <div class="row">
          <PlayerSelect v-if="!mine" v-model="e.who" blank="who" />
          <CharSelect v-model="e.char" blank="as" />
          <label class="small">N<input type="number" min="1" v-model.number="e.night" :placeholder="night" class="n"></label>
        </div>
        <div class="row">
          <PlayerSelect v-if="has('a')" v-model="e.a" blank="player" />
          <PlayerSelect v-if="has('b')" v-model="e.b" blank="player" />
          <PlayerSelect v-if="has('x')" v-model="e.x" blank="player" />
          <CharSelect v-if="has('c')" v-model="e.c" :only="form.team" :none="form.none ? 'none in play' : ''" blank="character" />
          <CharSelect v-if="has('d')" v-model="e.d" :only="form.dteam" blank="evil character" />
          <input v-if="has('num')" type="number" min="0" v-model="e.num" placeholder="number" class="n">
          <select v-if="has('yes')" v-model="e.yes"><option :value="null">-</option><option :value="true">{{ (form.yes || ['yes'])[0] }}</option><option :value="false">{{ (form.yes || [, 'no'])[1] }}</option></select>
          <select v-if="has('dir')" v-model="e.dir"><option value="">direction</option><option>clockwise</option><option>anticlockwise</option></select>
          <select v-if="has('al')" v-model="e.al"><option value="">alignment</option><option>good</option><option>evil</option></select>
          <input v-if="has('text')" v-model="e.text" placeholder="what they learned" class="grow" @keydown.enter="add">
          <button @click="add">Add</button>
        </div>
      </div>
      <div v-if="!mine" class="row mt"><span class="small">Show</span><PlayerSelect v-model="filter" blank="everyone" /></div>
      <div v-for="e in list" :key="e.id" class="info" :class="{ mine: e.who === g.me }">
        <span class="small">N{{ e.night }}</span>
        <Nm :n="e.who" />
        <span :class="'t-' + team(e.char)">{{ name(e.char) }}</span>
        <span class="grow">{{ text(e) }}</span>
        <button class="x" @click="drop(e)">&times;</button>
      </div>
    </div>`,
  };

  const WORD = { fit: "fits", break: "breaks", odd: "explained", soft: "red herring?" };
  const Worlds = {
    mixins: [base],
    components: { PlayerSelect, PlayerChips },
    data: () => ({ open: {} }),
    computed: {
      results() { return Object.fromEntries(this.g.worlds.map((w) => [w.id, B.checkWorld(w, this.g)])); },
    },
    methods: {
      word: (s) => WORD[s],
      clean(w) { const r = this.results[w.id]; return r.tally.break === 0 && !r.notes.length; },
      line(id) { const e = this.g.info.find((x) => x.id === id); return e ? `N${e.night} ${e.who}: ${infoText(this.g, e)}` : ""; },
      add(from) {
        const w = from
          ? { ...JSON.parse(JSON.stringify(from)), id: B.uid(this.g), name: from.name + " copy" }
          : { id: B.uid(this.g), name: "World " + (this.g.worlds.length + 1), demon: "", minions: [], odd: [], note: "" };
        this.g.worlds.push(w);
      },
      drop(w) { if (ask(`Delete ${w.name}?`)) this.g.worlds.splice(this.g.worlds.indexOf(w), 1); },
    },
    template: `<div>
      <p class="small">Pick a demon and minions, then check them against the Info log.</p>
      <div v-for="w in g.worlds" :key="w.id" class="card world" :class="{ clean: clean(w) }">
        <div class="row">
          <input v-model="w.name" class="bare grow">
          <button @click="add(w)" title="Copy this world">Copy</button>
          <button class="x" @click="drop(w)">&times;</button>
        </div>
        <div class="row"><span class="lab">Demon</span><PlayerSelect v-model="w.demon" /></div>
        <div class="row"><span class="lab">Minions</span><PlayerChips v-model="w.minions" cls="evil" /></div>
        <div class="row"><span class="lab" title="Drunk, poisoned, or registering wrong">Unreliable</span><PlayerChips v-model="w.odd" /></div>
        <div class="row tally" @click="open[w.id] = !open[w.id]">
          <span class="tag fit">{{ results[w.id].tally.fit }} fit</span>
          <span class="tag blk">{{ results[w.id].tally.break }} break</span>
          <span class="tag" v-if="results[w.id].tally.odd">{{ results[w.id].tally.odd }} explained</span>
          <span class="tag soft" v-if="results[w.id].tally.soft">{{ results[w.id].tally.soft }} herring?</span>
          <span class="small">{{ open[w.id] ? 'hide' : 'details' }}</span>
        </div>
        <div v-for="n in results[w.id].notes" :key="n" class="wnote">{{ n }}</div>
        <div v-if="open[w.id]">
          <div v-for="r in results[w.id].rows" :key="r.id" class="small"><span class="tag" :class="r.s === 'break' ? 'blk' : r.s">{{ word(r.s) }}</span> {{ line(r.id) }}</div>
          <div v-if="!results[w.id].rows.length" class="small">No checkable info yet.</div>
        </div>
        <input v-model="w.note" class="bare" placeholder="note">
      </div>
      <button @click="add()">New world</button>
    </div>`,
  };

  const Games = {
    mixins: [base],
    computed: { list() { return [...B.db.games].reverse(); }, latest: () => B.latest() },
    methods: {
      label(g) { return new Date(g.at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); },
      view(g) { B.ui.view = g === this.latest ? "" : g.id; B.ui.ticks = []; },
      fresh() { if (ask("Start a new game? The current one stays in this list.")) B.newGame(); },
      drop(g) {
        if (!ask("Delete this game?")) return;
        B.db.games.splice(B.db.games.indexOf(g), 1);
        if (!B.db.games.length) B.newGame();
        if (B.ui.view === g.id) B.ui.view = "";
      },
    },
    template: `<div>
      <p class="small">A new game starts on its own when the Storyteller starts one.</p>
      <div v-for="x in list" :key="x.id" class="card row" :class="{ lit: x === g }" @click="view(x)">
        <span>{{ label(x) }}</span>
        <span class="small">{{ x.players.length }} players, {{ x.votes.length }} votes</span>
        <span class="sp"></span>
        <span v-if="x === latest" class="tag">current</span>
        <button class="x" @click.stop="drop(x)">&times;</button>
      </div>
      <button @click="fresh">New game</button>
    </div>`,
  };

  B.PANELS = [
    { id: "votes", label: "Votes", comp: Votes },
    { id: "players", label: "Players", comp: Players },
    { id: "claims", label: "Claims", comp: Claims },
    { id: "mine", label: "My info", comp: { components: { Info }, template: `<Info mine />` } },
    { id: "info", label: "Info", comp: Info },
    { id: "worlds", label: "Worlds", comp: Worlds },
    { id: "games", label: "Games", comp: Games },
  ];
})();
