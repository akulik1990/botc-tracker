#!/usr/bin/env bash
# ./release.sh 0.6.4 "what changed" : commits whatever is changed along with the bump,
# builds and publishes the xpi and points updates.json at it, all in one commit
set -euo pipefail
v=${1:?usage: ./release.sh <version> [message]}
msg=${2:-$v}
dir=$(dirname "$(realpath "$0")")
repo=akulik1990/botc-tracker
g() { git -C "$dir" "$@"; }

sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$v\"/" "$dir/manifest.json"
g add -A
g archive --format=zip -o "$dir/botc-tracker.xpi" "$(g write-tree)" manifest.json vendor src
hash=$(sha256sum "$dir/botc-tracker.xpi" | cut -d' ' -f1)
cat > "$dir/updates.json" <<JSON
{
  "addons": {
    "botc-vote-tracker@akulik1990": {
      "updates": [
        {
          "version": "$v",
          "update_link": "https://github.com/$repo/releases/download/v$v/botc-tracker.xpi",
          "update_hash": "sha256:$hash"
        }
      ]
    }
  }
}
JSON
g add updates.json
g commit -qm "$msg"
g tag "v$v"
g push -q origin "v$v"
gh release create "v$v" "$dir/botc-tracker.xpi" --repo "$repo" --title "$v" --notes ""
# master last: installed copies read updates.json from master, so the asset has to exist first
g push -q origin master
