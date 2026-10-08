#!/usr/bin/env bash
set -euo pipefail

: "${RUNNER_TEMP:?prepare-ci-bubblewrap requires RUNNER_TEMP}"
: "${GITHUB_PATH:?prepare-ci-bubblewrap requires GITHUB_PATH}"

if [[ "$(uname -s)" != 'Linux' || "$(uname -m)" != 'x86_64' ]]; then
  echo 'prepare-ci-bubblewrap supports only Linux x86_64 hosted runners' >&2
  exit 1
fi

# APT authenticates the archive index and verifies the payload hash. Refresh
# metadata before resolving the candidate: superseded pool URLs can disappear.
# Download/extract avoids dpkg transactions and package post-install hooks.
apt_options=(
  -o APT::Update::Error-Mode=any
  -o APT::Get::AllowUnauthenticated=false
  -o Acquire::AllowInsecureRepositories=false
  -o Acquire::AllowDowngradeToInsecureRepositories=false
  -o Acquire::Retries=3
)
sudo apt-get "${apt_options[@]}" update

work="$(mktemp -d "${RUNNER_TEMP}/dsh-bubblewrap.XXXXXX")"
root="$work/root"
(
  cd "$work"
  apt-get "${apt_options[@]}" download bubblewrap:amd64
)
archives=("$work"/*.deb)
if [[ ${#archives[@]} -ne 1 || ! -f "${archives[0]}" ]]; then
  echo 'APT must download exactly one bubblewrap archive' >&2
  exit 1
fi
archive="${archives[0]}"
dpkg-deb --show --showformat='${Package} ${Version} ${Architecture}\n' "$archive"
sha256sum "$archive"
mkdir -p "$root"
dpkg-deb --extract "$archive" "$root"

sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 \
  || echo 'apparmor userns knob absent — the functional probe decides'
"$root/usr/bin/bwrap" --version
"$root/usr/bin/bwrap" --ro-bind / / --dev /dev --unshare-pid --proc /proc --die-with-parent -- true
printf '%s\n' "$root/usr/bin" >> "$GITHUB_PATH"
echo 'bubblewrap functional probe passed'
