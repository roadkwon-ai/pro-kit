#!/usr/bin/env bash
# pro-kit 템플릿 설치: bash install.sh <project-dir> [--diff] [--skip-skills] [--with-global]
set -euo pipefail
exec node "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/install.mjs" "$@"
