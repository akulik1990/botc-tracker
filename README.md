# BOTC tracker

Firefox add-on for [botc.app](https://botc.app). It adds the player-side notes the app doesn't have, in panels that sit on the town square.

- **Votes**: every nomination and vote, saved when the clock hand finishes. Grouped by day, voters in hand order, ghost votes dashed, who ended up on the block. Tick a few and Compare for a player by vote grid. The app only keeps a vote history for the storyteller and grimoire access, so this is the main gap it fills.
- **Players**: a claim, a good / evil read and a note per seat, plus notes for the whole game. Character tokens you put on seats in your grimoire count as claims too (shown faded). Every claim change is kept in order with the phase it happened in, and the latest one is what Claims and Worlds use.
- **My info**: your character and ability, and what you learn each night.
- **Claims**: the current script's characters with who claims each one, double claims, characters nobody has claimed, players with no claim, and the setup counts (Baron and friends included).
- **Info**: what everyone says they learned and on which night, yours included.
- **Worlds**: pick a demon and minions and see which info fits or breaks. Checked characters:
  - Trouble Brewing: Washerwoman, Librarian, Investigator, Chef, Empath, Fortune Teller, Undertaker, Ravenkeeper
  - Sects & Violets: Clockmaker, Dreamer, Oracle, Seamstress, Sage, Snake Charmer, Flowergirl and Town Crier (these two read the captured votes)
  - others: Grandmother, Noble, Steward, Knight, Shugenja, Bounty Hunter, Village Idiot

  Anything else goes in as free text.
- **Games**: earlier games, kept for a while. A new game starts on its own when the storyteller starts one.

Tap any name to highlight that player everywhere. Each panel opens from the tab strip and either docks to the left or right edge (one per side, drag the inner edge to resize) or pops out into its own window you can drag and resize. The percentage button in a window's title bar steps its background through 100, 80, 60 and 40% so you can see the town square through it. The strip itself can be dragged by its grip.

Seats, deaths, your own character and the script all come from the game state the town square draws from, so the add-on sees nothing a player can't see on screen. Data stays in the browser's local storage for botc.app.

## Install

Needs Firefox 140 or later, or Zen.

For a quick test: `about:debugging#/runtime/this-firefox`, Load Temporary Add-on, pick `manifest.json`. It goes away when the browser restarts.

To keep it (Zen, Developer Edition, Nightly, ESR; regular Firefox needs Mozilla signing):

1. Build: `git archive --format=zip -o botc-tracker.xpi HEAD manifest.json vendor src`
2. In `about:config` set `xpinstall.signatures.required` to `false`
3. `about:addons`, gear menu, Install Add-on From File, pick the `.xpi`

Updating is the same three steps; it replaces the old version and keeps your notes.

Vue 3.5.13 is bundled in `vendor/` (MIT).
