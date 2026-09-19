#!/usr/bin/env bash
#
# Demiplane provisioning: creates the D1 database and R2 bucket, wires the
# database_id into wrangler.jsonc, and applies migrations to the deployed DB.
#
# Run AFTER:
#   1. `npx wrangler login` succeeds
#   2. R2 is enabled on your account (Storage & databases > R2 > checkout)
#
# Usage:
#   bash scripts/provision.sh
#   R2_BUCKET=my-unique-bucket bash scripts/provision.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

DB_NAME="${D1_NAME:-demiplane-db}"
BUCKET_NAME="${R2_BUCKET:-demiplane-files}"

echo "==> Checking Wrangler auth"
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx wrangler login" >&2
  exit 1
fi
npx wrangler whoami | sed -n '1,6p'
echo

echo "==> Creating D1 database: $DB_NAME"
CREATE_OUTPUT="$(npx wrangler d1 create "$DB_NAME" 2>&1 || true)"
echo "$CREATE_OUTPUT"

DB_ID="$(printf '%s' "$CREATE_OUTPUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -n1 || true)"

if [ -z "$DB_ID" ]; then
  echo "==> D1 may already exist; looking it up via 'd1 list --json'"
  DB_ID="$(npx wrangler d1 list --json 2>/dev/null \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const db=j.find(x=>x.name==='$DB_NAME');console.log(db?db.uuid:'')}catch{console.log('')}})" \
    || true)"
fi

if [ -z "$DB_ID" ]; then
  echo "Could not determine the database_id. Create it in the dashboard, then"
  echo "set database_id in wrangler.jsonc manually." >&2
  exit 1
fi
echo "==> database_id: $DB_ID"

echo "==> Writing database_id into wrangler.jsonc"
DB_ID="$DB_ID" node <<'NODE'
const fs = require("fs");
const id = process.env.DB_ID;
const file = "wrangler.jsonc";
const text = fs.readFileSync(file, "utf8");
const next = text.replace(/("database_id"\s*:\s*")[^"]*(")/, `$1${id}$2`);
fs.writeFileSync(file, next);
console.log("  updated:", next.includes(id));
NODE

echo "==> Creating R2 bucket: $BUCKET_NAME"
npx wrangler r2 bucket create "$BUCKET_NAME" 2>&1 \
  | sed 's/^/  /' || echo "  (bucket may already exist — continuing)"

echo "==> Applying migrations to the deployed D1"
npx wrangler d1 migrations apply "$DB_NAME" --remote

cat <<EOF

==> Almost there. Now set the deployed secrets (you will be prompted for each):

  npx wrangler secret put OWNER_EMAIL       # the one email allowed to sign in
  npx wrangler secret put SESSION_SECRET    # generate: openssl rand -base64 32
  npx wrangler secret put RESEND_API_KEY    # from https://resend.com/api-keys

Then deploy:

  npm run deploy

EOF
