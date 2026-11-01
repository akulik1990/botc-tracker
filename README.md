# BOTC tracker

A Firefox add-on for [botc.app](https://botc.app). It puts the notes into panels on the town square and keeps track of votes.

## Panels

Votes is the reason this exists. The app only keeps vote history if you're the storyteller or have grimoire access, so the add-on saves every nomination once the clock hand finishes going round. Votes are grouped by day with voters in hand order, ghost votes dashed, and whoever ended up on the block marked. Tick a few and hit Compare to get a player by vote grid.

Players has a claim, a good/evil read and a note for each seat, plus a box for notes on the whole game. Tokens you drop on seats in your grimoire count as claims (they show faded). Claim changes are kept in order with the phase they happened in, so if someone goes from Investigator to Undertaker you see both, and Claims and Worlds use the latest.

Claims lists the script's characters and who claims each, with double claims, unclaimed characters and players who haven't claimed anything. The setup counts at the top know about the Baron and the other characters that change them.

Info starts with your own character, its ability and what you've learned each night. Under that is what everyone else says they learned, and when.

Worlds lets you pick a demon and minions and shows which info fits that world and which breaks it. It checks these characters:

- Trouble Brewing: Washerwoman, Librarian, Investigator, Chef, Empath, Fortune Teller, Undertaker, Ravenkeeper
- Sects & Violets: Clockmaker, Dreamer, Oracle, Seamstress, Sage, Snake Charmer, Flowergirl and Town Crier (those two read the saved votes)
- Bad Moon Rising: Grandmother, and a Gambler who guessed and lived
- the rest: Noble, Steward, Knight, Shugenja, Bounty Hunter, Village Idiot

Anything else goes in as free text and isn't checked. Each world can say which demon it is. With a Vortox, Townsfolk info has to be false to fit. With a No Dashii, its nearest Townsfolk on each side are treated as poisoned. Wrong info from a player the world makes evil counts as a lie, not a break, and you can mark anyone else drunk or poisoned by hand.

Games keeps your last few games. A new one starts by itself when the storyteller starts a game.

Click a name anywhere to highlight that player in every panel.

## Windows

The tabs sit on the edge of the screen. Click one and its panel slides out with the tabs attached to its side; click it again to put it away. Drag the panel's inner edge to make it wider. The arrow in the title bar moves the whole thing to the other side of the screen, and the grip at the top of the tabs slides them up or down.

Pop out turns a panel into a window you can drag and resize, and you can have as many of those open as you like. The percentage button fades the background (100, 80, 60, 40%) so the town square shows through.

Seats, deaths, your character and the script come from the same game state the town square is drawn from, so the add-on never sees anything you can't see on screen. Everything is saved in the browser's local storage for botc.app.

## Install

You need Firefox 140 or newer.

1. Grab `botc-tracker.xpi` from the [latest release](https://github.com/akulik1990/botc-tracker/releases/latest), or build it with `git archive --format=zip -o botc-tracker.xpi HEAD manifest.json vendor src`
2. In `about:config`, set `xpinstall.signatures.required` to `false`
3. In `about:addons`, open the gear menu, choose Install Add-on From File and pick the `.xpi`

## Releasing

Run `./release.sh 0.6.4 "what changed"` with the new version. Anything you haven't committed goes into the same commit. The script bumps the manifest, builds the `.xpi`, makes the GitHub release and then updates `updates.json`, which is the file installed copies check.

Vue 3.5.13 is bundled in `vendor/` (MIT).
