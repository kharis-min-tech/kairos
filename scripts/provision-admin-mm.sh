#!/bin/bash
set -e
TOKEN="nng9fm34h3fzze6oyftmpi51zy"
MM_URL="http://localhost:8065"

# Create or fetch admin Mattermost account
RESPONSE=$(curl -s -X POST "$MM_URL/api/v4/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.local","username":"admin-f252","password":"Krs-AdminLocal1!","first_name":"Admin","last_name":"Kairos"}')

MM_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")

# If creation failed due to duplicate email, look up existing
if [ -z "$MM_ID" ] || [[ "$MM_ID" == app.* ]]; then
  RESPONSE=$(curl -s "$MM_URL/api/v4/users/email/admin@kairos.local" -H "Authorization: Bearer $TOKEN")
  MM_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
fi

echo "Mattermost user ID: $MM_ID"

docker exec -i kairos-db psql -U kairos kairos -c \
  "UPDATE members SET mattermost_user_id='$MM_ID' WHERE email='admin@kairos.local' RETURNING email, mattermost_user_id;"
