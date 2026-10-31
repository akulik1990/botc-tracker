# BOTC vote tracker

Firefox add-on for [botc.app](https://botc.app). The app only keeps a vote history for the storyteller and anyone with grimoire access, so players lose track of who voted for what. This saves every nomination and vote of the game in a panel at the side of the town square.

- votes grouped by day, voters in the order the hand reached them
- ghost votes shown dashed, count against majority, who ended up on the block
- tap any name to highlight it in every vote
- tick a few votes and hit Compare for a player by vote grid

A vote is saved once the clock hand has gone all the way round. Votes the storyteller cancels early are skipped, and secret votes are saved without voters.

It reads the same game state the town square draws from, so it sees nothing a player can't already see on screen. Data stays in the browser's local storage for botc.app.

## Install for testing

1. Open `about:debugging#/runtime/this-firefox`
2. Load Temporary Add-on, pick `manifest.json` from this folder
3. Open or reload botc.app, the Votes tab sits on the right edge

Temporary add-ons go away when the browser restarts.

## Permanent install without signing

Works in Zen, Firefox Developer Edition, Nightly and ESR. Regular Firefox ignores the setting and needs the add-on signed by Mozilla.

1. Build the file: `git archive --format=zip -o botc-vote-tracker.xpi HEAD manifest.json vote-tracker.js`
2. In `about:config` set `xpinstall.signatures.required` to `false`
3. `about:addons`, gear menu, Install Add-on From File, pick the `.xpi`

Needs Firefox 140 or later.
