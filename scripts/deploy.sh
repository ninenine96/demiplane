#!/usr/bin/env bash
#
# Build, check and deploy this Worker. The same script runs locally and in CI,
# so there is one definition of "deploy" per repo.
#
#   bash scripts/deploy.sh              # checks -> build -> deploy
#   bash scripts/deploy.sh --dry-run    # checks -> build -> wrangler --dry-run
#   bash scripts/deploy.sh --migrate    # apply remote D1 migrations first
#   bash scripts/deploy.sh --skip-checks
#
# Auth: `npx wrangler login` locally, or CLOUDFLARE_API_TOKEN (plus
# CLOUDFLARE_ACCOUNT_ID) in CI. Migrations run only when --migrate is passed,
# so nothing changes the production schema unattended.
#
# NOTE: when `build` already runs typecheck (this repo does), tsc runs twice.
# It costs seconds and keeps a type failure labelled as a type failure.
#
set -euo pipefail
cd "$(dirname "$0")/.."

# --- per-app: extra arguments for `wrangler deploy` --------------------------
WRANGLER_DEPLOY_ARGS=()
# ----------------------------------------------------------------------------

DRY_RUN=0
MIGRATE=0
SKIP_CHECKS=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --migrate) MIGRATE=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "deploy: unknown argument: $arg (try --help)" >&2
      exit 2
      ;;
  esac
done

step() { printf '\n==> %s\n' "$*"; }

has_script() {
  node -e "const s = require('./package.json').scripts || {}; process.exit(s['$1'] ? 0 : 1)"
}

step "Preflight"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "  auth: CLOUDFLARE_API_TOKEN${CLOUDFLARE_ACCOUNT_ID:+ (account $CLOUDFLARE_ACCOUNT_ID)}"
elif npx wrangler whoami >/dev/null 2>&1; then
  echo "  auth: wrangler login"
else
  echo "  not authenticated: run 'npx wrangler login' or set CLOUDFLARE_API_TOKEN" >&2
  exit 1
fi

if [ "$SKIP_CHECKS" -eq 0 ]; then
  if has_script typecheck; then
    step "Typecheck"
    npm run typecheck
  fi
  if has_script test; then
    step "Tests"
    npm test
  fi
fi

step "Build"
if ! has_script build; then
  echo "  package.json has no 'build' script" >&2
  exit 1
fi
npm run build

if [ "$MIGRATE" -eq 1 ]; then
  step "Apply remote D1 migrations"
  if ! has_script db:migrate:remote; then
    echo "  package.json has no 'db:migrate:remote' script" >&2
    exit 1
  fi
  npm run db:migrate:remote
fi

step "Deploy"
deploy_args=("${WRANGLER_DEPLOY_ARGS[@]}")
if [ "$DRY_RUN" -eq 1 ]; then
  deploy_args+=(--dry-run)
  echo "  dry run: nothing is uploaded"
fi
npx wrangler deploy "${deploy_args[@]}"
