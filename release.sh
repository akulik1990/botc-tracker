#!/usr/bin/env bash
# ./release.sh <version> "what changed": commits whatever changed along with the bump, builds and
# publishes the xpi and points updates.json at it. A commit under an hour old (or FOLD=1) gets folded
# in, its message replaced and its release swapped for the new one.
set -euo pipefail
v=${1:?usage: ./release.sh <version> [message]}
msg=${2:-$v}
dir=$(dirname "$(realpath "$0")")
repo=akulik1990/botc-tracker
g() { git -C "$dir" "$@"; }

g fetch -q origin
[ "$(g rev-parse HEAD)" = "$(g rev-parse origin/master)" ] || { echo "master and origin/master differ, pull first" >&2; exit 1; }
fold=${FOLD:-$(( $(date +%s) - $(g log -1 --format=%ct) < 3600 ))}
prev=$( ((fold)) && g tag --points-at HEAD | grep '^v' || true)

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
if ((fold)); then
  g commit -q --amend --date="$(date)" -m "$msg"
  [ -n "$prev" ] && g tag -d "$prev" >/dev/null
else
  g commit -qm "$msg"
fi
g tag "v$v"
g push -q origin "v$v"
# the same package as a .zip, to unzip and load unpacked in Chrome or Opera
cp "$dir/botc-tracker.xpi" "$dir/botc-tracker.zip"
gh release create "v$v" "$dir/botc-tracker.xpi" "$dir/botc-tracker.zip" --repo "$repo" --title "$v" --notes ""
# master after the asset exists: installed copies read updates.json from master
g push -q --force-with-lease origin master
# the replaced release goes last, so the old link works until the new one is live
[ -n "$prev" ] && gh release delete "$prev" --repo "$repo" --cleanup-tag -y
true
