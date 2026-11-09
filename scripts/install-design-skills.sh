#!/usr/bin/env bash
# Install pinned upstream skill files for this checkout without running upstream installers.
set -euo pipefail

root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
destination="$root/.agents/skills"
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT
mkdir -p "$destination"

install_skill() {
  local name="$1" repository="$2" revision="$3" source="$4"
  if [[ -e "$destination/$name" || -L "$destination/$name" ]]; then
    if [[ -r "$destination/$name/SKILL.md" ]] &&
      grep -qx "name: $name" "$destination/$name/SKILL.md"; then
      printf 'Already present: %s\n' "$destination/$name/SKILL.md"
      return
    fi
    printf 'Existing directory needs review: %s\n' "$destination/$name" >&2
    return 1
  fi

  local checkout="$staging/$name" payload="$staging/payload-$name"
  git init -q "$checkout"
  git -C "$checkout" -c core.hooksPath=/dev/null fetch -q --depth=1 "$repository" "$revision"
  test "$(git -C "$checkout" rev-parse FETCH_HEAD)" = "$revision"
  mkdir "$payload"
  git -C "$checkout" archive "FETCH_HEAD:$source" | tar -xf - -C "$payload"
  test -r "$payload/SKILL.md"
  grep -qx "name: $name" "$payload/SKILL.md"
  if git -C "$checkout" cat-file -e FETCH_HEAD:LICENSE 2>/dev/null; then
    git -C "$checkout" show FETCH_HEAD:LICENSE > "$payload/UPSTREAM-LICENSE"
  fi
  mv "$payload" "$destination/$name"
  printf 'Installed: %s\n' "$destination/$name/SKILL.md"
}

install_skill frontend-design https://github.com/anthropics/skills.git 2c5958ecac7cee2b583967a2c4981d0f4a75c579 skills/frontend-design
install_skill ui-ux-pro-max https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git 4f2dbb67e64969a9a30ab00742f2d55d66ddec2b .claude/skills/ui-ux-pro-max
install_skill design-taste-frontend https://github.com/Leonxlnx/taste-skill.git f6b76575f949707b4e3c37cd86cb44b0b98643e8 skills/taste-skill
install_skill impeccable https://github.com/pbakaus/impeccable.git 613fbf88e0ef08709eaf238653285f430250c0ea .agents/skills/impeccable
install_skill web-design-guidelines https://github.com/vercel-labs/agent-skills.git 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 skills/web-design-guidelines
