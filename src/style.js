window.BVT.CSS = `
:host { all: initial; }
* { box-sizing: border-box; font: 13px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif; color: inherit; }
button, select, input, textarea { background: rgba(35, 39, 50, var(--a, 1)); color: #e6e8ec; border: 1px solid #2e3340; border-radius: 6px; padding: 3px 7px; }
button { cursor: pointer; }
button:hover:not(:disabled) { border-color: #5b8def; }
button:disabled { opacity: .5; cursor: default; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #5b8def; }
select { max-width: 150px; }
textarea { width: 100%; resize: vertical; }
input.n { width: 56px; }
.bare { background: transparent; border-color: transparent; }
.bare:hover, .bare:focus { border-color: #2e3340; }

.strip { position: fixed; display: flex; flex-direction: column; gap: 3px; background: rgba(20, 22, 26, .9);
  border: 1px solid #2e3340; padding: 4px 3px; color: #e6e8ec; transition: left .2s ease, right .2s ease; }
.strip.right { border-radius: 8px 0 0 8px; border-right: 0; }
.strip.left { border-radius: 0 8px 8px 0; border-left: 0; }
.strip.sizing { transition: none; }
.strip button { writing-mode: vertical-rl; padding: 8px 3px; font-size: 12px; }
.strip button.on { border-color: #d8b04a; color: #d8b04a; }
.grip { cursor: ns-resize; color: #8b93a3; text-align: center; font-size: 10px; letter-spacing: -2px; user-select: none; touch-action: none; }

.win { position: fixed; display: flex; flex-direction: column; background: rgba(20, 22, 26, var(--a)); color: #e6e8ec;
  border: 1px solid #2e3340; box-shadow: 0 6px 24px rgba(0, 0, 0, .5); }
.win.dock { top: 0; height: 100vh; transition: transform .2s ease; }
.win.shut { box-shadow: none; }
.win.see { text-shadow: 0 1px 2px #000; }
.pct { font-size: 11px; padding: 3px 5px; color: #8b93a3; }
.edge { position: absolute; top: 0; bottom: 0; width: 7px; cursor: ew-resize; z-index: 1; touch-action: none; }
.dock.right .edge { left: -3px; }
.dock.left .edge { right: -3px; }
.win.float { border-radius: 8px; resize: both; overflow: hidden; min-width: 240px; min-height: 160px; }
header { display: flex; gap: 6px; align-items: center; padding: 6px 8px; background: rgba(26, 29, 35, var(--a)); border-bottom: 1px solid #2e3340; }
.float header { cursor: move; touch-action: none; }
header b { font-size: 14px; }
.body { flex: 1; overflow: auto; padding: 8px 10px 16px; }
.old { margin: 6px 10px 0; padding: 4px 6px; border-radius: 6px; background: #2a2f3d; }
.hlchip { border-color: #d8b04a; color: #d8b04a; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sp { flex: 1; }
.grow { flex: 1; min-width: 0; }
.row { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.bar { margin-bottom: 6px; }
.mt { margin-top: 8px; }
.small { color: #8b93a3; font-size: 12px; }
h3 { color: #8b93a3; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; margin: 12px 0 4px; font-weight: 600; }
p { margin: 4px 0 8px; }

.card { background: rgba(28, 31, 38, var(--a, 1)); border: 1px solid #2e3340; border-radius: 8px; padding: 6px 8px; margin-bottom: 6px; }
.card.lit { border-color: #d8b04a; }
.nm { cursor: pointer; font-weight: 600; border-radius: 4px; padding: 0 2px; }
.nm.soft { font-weight: 400; margin-right: 4px; }
.hl, .nm.hl, .chip.hl { outline: 2px solid #d8b04a; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; align-items: center; }
.chip { cursor: pointer; background: #232732; border: 1px solid #2e3340; border-radius: 10px; padding: 0 7px; }
.chip.g { border-style: dashed; color: #b9c0cc; }
.chip.evil { border-color: #e0483f; }
.chip .x { border: 0; background: none; padding: 0 0 0 4px; }
.cnt { font-weight: 700; color: #8b93a3; }
.cnt.ok { color: #3fbf5f; }
.tag { font-size: 10px; font-weight: 700; padding: 0 5px; border-radius: 3px; border: 1px solid #2e3340; color: #8b93a3; }
.tag.blk { color: #e0483f; border-color: #e0483f; }
.tag.fit { color: #3fbf5f; border-color: #3fbf5f; }
.tag.soft { color: #d8b04a; border-color: #d8b04a; }
.x { padding: 0 6px; }

.gw { overflow-x: auto; }
table { border-collapse: collapse; margin-top: 4px; }
th, td { padding: 3px 6px; border-bottom: 1px solid #2e3340; text-align: center; white-space: nowrap; }
th { color: #8b93a3; font-size: 11px; font-weight: 600; }
td:first-child { text-align: left; }
tr.hl td { background: #3a3220; }
tr.hl { outline: none; }
.mV { color: #3fbf5f; font-weight: 700; }
.mG { color: #b07ce8; font-weight: 700; }
.mN { color: #8b93a3; }
.m- { color: #4a5060; }

.prow { border-bottom: 1px solid #2e3340; padding: 5px 0; }
.prow.hl { outline: none; background: #2a2618; }
.prow.dead .nm { text-decoration: line-through; opacity: .7; }
.seat { color: #8b93a3; width: 18px; text-align: right; font-size: 11px; }
.note { width: 100%; margin-top: 4px; background: transparent; }
.read { width: 26px; padding: 2px 0; font-weight: 700; }
.read.good { color: #5b8def; border-color: #5b8def; }
.read.evil { color: #e0483f; border-color: #e0483f; }

.claim { display: flex; gap: 6px; padding: 3px 6px; border-radius: 6px; cursor: pointer; }
.claim:hover { background: #232732; }
.claim.none { opacity: .45; }
.claim.twice { background: #3a1f1f; }
.claim .who { font-weight: 400; }
.ability { font-size: 12px; color: #b9c0cc; padding: 2px 8px 6px; }
.t-townsfolk { color: #5b8def; }
.t-outsider { color: #3fb8c9; }
.t-minion { color: #e8913a; }
.t-demon { color: #e0483f; }
.t-traveller { color: #b07ce8; }
.claim .nm { color: #e6e8ec; }
.nm.tok { font-style: italic; opacity: .65; }
select.tok { font-style: italic; color: #8b93a3; }
.nm.was { text-decoration: line-through; opacity: .5; font-weight: 400; }
.hist { display: flex; flex-wrap: wrap; gap: 2px 6px; font-size: 12px; margin-top: 3px; padding-left: 24px; }
.hist span + span::before { content: "\\2192  "; color: #8b93a3; }
.hist .was { color: #8b93a3; text-decoration: line-through; }
.hist small { color: #8b93a3; font-size: 11px; }
.hist .x { border: 0; background: none; padding: 0 2px; color: #8b93a3; }
.me { padding-bottom: 6px; }
.me .ability { padding: 2px 0 0; }

.form { display: flex; flex-direction: column; gap: 5px; padding-bottom: 6px; border-bottom: 1px solid #2e3340; }
.info { display: flex; gap: 6px; align-items: baseline; padding: 4px 0; border-bottom: 1px solid #2e3340; }
.info.mine { background: rgba(28, 34, 48, var(--a, 1)); }

.world.clean { border-color: #3fbf5f; }
.world .row { margin: 3px 0; }
.lab { width: 70px; color: #8b93a3; font-size: 12px; }
.tally { cursor: pointer; }
.wnote { color: #d8b04a; font-size: 12px; }
`;
