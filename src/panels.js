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

  const charName = (g, id) => B.char(g, id)?.name || "";
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
      case "gambler": return `guessed ${e.a} is the ${c}, ${e.yes ? "lived" : e.yes === false ? "died" : "?"}`;
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

  const fresh = () => ({ who: "", char: "", night: "", a: "", b: "", x: "", c: "", d: "", num: "", yes: null, dir: "", al: "", text: "" });
  // what one player says they learned, filled in for that player and their claim
  const InfoForm = {
    mixins: [base],
    components: { CharSelect, PlayerSelect },
    props: { who: String, seed: { type: Object, default: () => ({}) } },
    emits: ["added"],
    data() { return { e: this.start() }; },
    computed: {
      form() { return B.FORMS[this.e.char] || { f: ["text"] }; },
      night() { return B.night(this.g.phase); },
    },
    methods: {
      has(k) { return this.form.f.includes(k); },
      start() {
        const g = B.game();
        return { ...fresh(), who: this.who, char: this.who === g.me ? B.myChar(g) : B.claimOf(g, this.who).id, ...this.seed };
      },
      add() {
        if (!this.e.char) return;
        const e = { ...this.e, id: B.uid(this.g), night: this.e.night || this.night };
        if (e.num !== "") e.num = Number(e.num);
        this.g.info.push(e);
        this.$emit("added");
      },
    },
    template: `<div class="form">
      <div class="row">
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
    </div>`,
  };

  const READS = ["", "good", "evil"];
  const Players = {
    mixins: [base],
    components: { Nm, CharSelect, InfoForm },
    data: () => ({ adding: "", more: {}, seed: {} }),
    computed: {
      myId() { return B.myChar(this.g); },
      blk() { return B.blocks(this.g.votes); },
      auto() { const c = this.g.myChar || B.claimOf(this.g, this.g.me).id; return c ? `${charName(this.g, c)} (from the game)` : "your character"; },
    },
    methods: {
      // a day death with them on the block (or a passed exile) was the vote; anything else just died
      fate(n) {
        const ph = this.g.deaths[n];
        const x = ph > 0 && ph % 2 === 0 && this.g.votes.find((v) => v.phase === ph && v.on === n && (this.blk.has(v.id) || (v.exile && B.total(v) >= B.need(v))));
        return (x ? (x.exile ? "exiled " : "executed ") : "died ") + B.short(ph);
      },
      infos(n) { return this.g.info.filter((e) => e.who === n).sort((x, y) => x.night - y.night); },
      shown(n) { const l = this.infos(n); return this.more[n] ? l : l.slice(-1); },
      text(e) { return infoText(this.g, e); },
      team(id) { return B.char(this.g, id)?.team || ""; },
      about(id) { return B.char(this.g, id)?.ability || ""; },
      dropInfo(e) { if (ask("Delete this info?")) this.g.info.splice(this.g.info.indexOf(e), 1); },
      cycle(n) { this.g.reads[n] = READS[(READS.indexOf(this.g.reads[n] || "") + 1) % READS.length]; },
      cur(n) { return B.claimOf(this.g, n); },
      pick(n, id) { B.addClaim(this.g, n, id, "set"); },
      hist(n) { return this.g.log[n] || []; },
      showHist(n) { const h = this.hist(n); return h.length > 1 || (h.length && h[0].src !== "set"); },
      drop(n, i) { this.g.log[n].splice(i, 1); },
      again(n, e) { this.seed = { char: e.char, night: e.night + 1 }; this.adding = n; },
      cname(id) { return charName(this.g, id) || "no claim"; },
      src: (s) => ({ token: " token", me: " yours", reveal: " revealed", public: "" })[s] || "",
      short: B.short,
    },
    template: `<div>
      <div v-if="g.me" class="me">
        <CharSelect v-model="g.mine" :blank="auto" :class="'mine t-' + team(myId)" title="Pick your character to fix it, or leave it to follow the game" />
        <div class="ability">{{ about(myId) }}</div>
      </div>
      <textarea v-model="g.eval" rows="3" placeholder="Notes for this game"></textarea>
      <p v-if="!g.players.length" class="small">Seats show up here once you're in a game.</p>
      <div v-for="(n, i) in g.players" :key="n" class="prow" :class="{ hl: ui.hl === n, dead: n in g.deaths }">
        <div class="row">
          <span class="seat" :class="{ gone: n in g.deaths }">{{ i + 1 }}</span>
          <Nm :n="n" />
          <span v-if="n === g.me" class="tag">you</span>
          <span v-if="g.travellers.includes(n)" class="tag">traveller</span>
          <span v-if="n in g.deaths" class="tag" :class="fate(n).startsWith('died') ? 'blk' : 'exec'">&dagger; {{ fate(n) }}</span>
          <span class="sp"></span>
          <button class="read" :class="g.reads[n]" @click="cycle(n)" :title="'Read: ' + (g.reads[n] || 'none')">{{ (g.reads[n] || '?')[0].toUpperCase() }}</button>
          <CharSelect :modelValue="cur(n).id" @update:modelValue="pick(n, $event)" blank="claim" :class="['t-' + team(cur(n).id), { tok: cur(n).src === 'token' }]" :title="about(cur(n).id)" />
          <button class="x" @click="seed = {}; adding = adding === n ? '' : n" title="Add what they learned">+</button>
        </div>
        <div v-if="showHist(n)" class="hist">
          <span v-for="(c, k) in hist(n)" :key="k" :class="['t-' + team(c.id), { was: k < hist(n).length - 1 }]" :title="about(c.id)">{{ cname(c.id) }}
            <small>{{ short(c.phase) }}{{ src(c.src) }}</small><button class="x" @click="drop(n, k)" title="Remove">&times;</button></span>
        </div>
        <div v-for="e in shown(n)" :key="e.id" class="info">
          <span class="small">N{{ e.night }}</span>
          <span :class="'t-' + team(e.char)" :title="about(e.char)">{{ cname(e.char) }}</span>
          <span class="grow">{{ text(e) }}</span>
          <button class="x" @click="again(n, e)" title="Another one, next night">+</button>
          <button class="x" @click="dropInfo(e)" title="Delete">&times;</button>
        </div>
        <button v-if="infos(n).length > 1" class="x small" @click="more[n] = !more[n]">{{ more[n] ? 'latest only' : 'all ' + infos(n).length }}</button>
        <InfoForm v-if="adding === n" :key="seed.night" :who="n" :seed="seed" @added="adding = ''" />
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
          <div class="claim" :class="['t-' + o.c.team, { none: !o.by.length, twice: o.by.length > 1 }]" :title="o.c.ability" @click="flip(o.c.id)">
            <span>{{ o.c.name }}</span><span class="sp"></span><Nm v-for="n in o.was" :key="'w' + n" :n="n" cls="nm who was" /><Nm v-for="n in o.by" :key="n" :n="n" :cls="'nm who' + (tok(n) ? ' tok' : '')" />
          </div>
          <div v-if="shown === o.c.id" class="ability">{{ o.c.ability }}</div>
        </template>
      </div>
    </div>`,
  };



  const Night = {
    mixins: [base],
    components: { Nm },
    data: () => ({ pick: "" }),
    computed: {
      // during the day it's the coming night
      n() {
        const ph = this.g.phase, n = ph % 2 ? (ph + 1) / 2 : ph / 2 + 1;
        return this.pick === "first" ? 1 : this.pick === "other" ? Math.max(2, n) : n;
      },
      list() {
        const k = this.n === 1 ? "first" : "other";
        return Object.values(this.g.chars).filter((c) => c[k] > 0).sort((a, b) => a[k] - b[k]);
      },
    },
    methods: {
      who(id) { return this.g.players.filter((p) => (p === this.g.me ? B.myChar(this.g) : B.claimOf(this.g, p).id) === id); },
      logged(p) { return this.g.info.some((e) => e.who === p && +e.night === this.n); },
      gone(p) { return p in this.g.deaths && this.g.deaths[p] < 2 * this.n - 1; },
    },
    template: `<div>
      <div class="row bar">
        <button :class="{ on: n === 1 }" @click="pick = 'first'">First night</button>
        <button :class="{ on: n > 1 }" @click="pick = 'other'">Other nights</button>
        <button v-if="pick" @click="pick = ''" title="Follow the game">Now</button>
        <span class="sp"></span><span class="small">Night {{ n }}</span>
      </div>
      <p v-if="!list.length" class="small">The script's night order loads once you're in a game.</p>
      <div v-for="c in list" :key="c.id" class="claim" :class="['t-' + c.team, { none: !who(c.id).length }]" :title="c.ability">
        <span>{{ c.name }}</span><span class="sp"></span>
        <template v-for="p in who(c.id)" :key="p">
          <Nm :n="p" :cls="'nm who' + (gone(p) ? ' was' : '')" /><span v-if="logged(p)" class="small" title="Info logged for this night">&#10003;</span>
        </template>
      </div>
    </div>`,
  };

  const WORD = { fit: "fits", break: "breaks", odd: "explained", soft: "red herring?" };
  const Worlds = {
    mixins: [base],
    components: { PlayerSelect, PlayerChips, CharSelect },
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
          : { id: B.uid(this.g), name: "World " + (this.g.worlds.length + 1), demon: "", kind: "", minions: [], odd: [], note: "" };
        this.g.worlds.push(w);
      },
      drop(w) { if (ask(`Delete ${w.name}?`)) this.g.worlds.splice(this.g.worlds.indexOf(w), 1); },
    },
    template: `<div>
      <p class="small">Pick a demon and minions, then check them against what players learned.</p>
      <div v-for="w in g.worlds" :key="w.id" class="card world" :class="{ clean: clean(w) }">
        <div class="row">
          <input v-model="w.name" class="bare grow">
          <button @click="add(w)" title="Copy this world">Copy</button>
          <button class="x" @click="drop(w)">&times;</button>
        </div>
        <div class="row"><span class="lab">Demon</span><PlayerSelect v-model="w.demon" /><CharSelect v-model="w.kind" only="demon" blank="as" title="Vortox and No Dashii change what counts as wrong info" /></div>
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
    { id: "players", label: "Players", comp: Players },
    { id: "votes", label: "Votes", comp: Votes },
    { id: "worlds", label: "Worlds", comp: Worlds },
    { id: "claims", label: "Characters", comp: Claims },
    { id: "night", label: "Night", comp: Night },
    { id: "games", label: "Games", comp: Games },
  ];
})();
