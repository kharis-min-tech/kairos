#!/bin/bash
API="https://fiozyca9ah.execute-api.eu-west-2.amazonaws.com"
TOKEN="eyJraWQiOiJGVmxkWFBGYmVGWjlJR3VXOUt0dlwvZ3V4UCsrampyS1A5NnIyZndsa1wvUDg9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJlNmUyYzI3NC00MDAxLTcwODYtNjE2Mi1kNThkZjgxMTI0YzAiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmV1LXdlc3QtMi5hbWF6b25hd3MuY29tXC9ldS13ZXN0LTJfcGNYdHhUdWh1IiwiY29nbml0bzp1c2VybmFtZSI6ImU2ZTJjMjc0LTQwMDEtNzA4Ni02MTYyLWQ1OGRmODExMjRjMCIsImdpdmVuX25hbWUiOiJBZG1pbiIsIm9yaWdpbl9qdGkiOiI0MzQ2NjM3My1mZTc0LTRkYjAtYjJlNi1mNzA2NjM5NmU1MDYiLCJhdWQiOiI1MWc0ZWdxbjE1dWtnaG84MG1iZ3NkaTVyMyIsImV2ZW50X2lkIjoiMGNlMmFkZGEtNTBhYi00YmJiLWIwYTAtMjQ0YjM5ZmMyMGQ4IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NzE5Mjg3MDEsImN1c3RvbTpicmFuY2hJZCI6IjEiLCJleHAiOjE3NzIwMTUxMDEsImN1c3RvbTpyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzE5Mjg3MDEsImZhbWlseV9uYW1lIjoiVXNlciIsImp0aSI6ImUzNWY0Njc2LTMxMWEtNDhkYy04NmUzLTcwYTJhMzllNmY4MyIsImVtYWlsIjoiYWRtaW5Aa2Fpcm9zLmNodXJjaCJ9.om_Ji8PtiZ6Cf1XK6QaRuLUP3M2ZnrEuIlza0vaab_Qz6H4adRmNkDQHXA9qbSmU2W4-uE94v9-61AiWqOWWA_9v2tIMXumwR4FQ8UWrQ7GVtrc7zLHWayvWZuwLVZUyxS1wGSf7jBw0L4hRVLA5qAf3C7NB3FZgQ0lWcWGNbIaMemYlcyzmpnZ9dLJmZsuZR1swrgFTW4_x8LhhLmUuU9x-ImbiFCASVvJSQ0T_Em0LwFNN737Tr9iE1DFxmFKE8qOwc8dgH-MSGA6Evr2Cn_jevmY-PGEImjUzcCMYc_MnSQDNaV3z7joDCmriJrzfTRwSqNIkma4ZuKt1nyjbPQ"

echo "Testing Fellowship API..."
echo ""

echo "1. List fellowships:"
curl -s "$API/v1/fellowships" -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "2. Create fellowship:"
RESULT=$(curl -s -X POST "$API/v1/fellowships" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"fellowship_name":"API Test Fellowship","fellowship_type":"K-Groups","branch_id":1,"meeting_schedule":"Wednesdays 7PM","location":"Main Hall"}')
echo "$RESULT" | jq '.'
FID=$(echo "$RESULT" | jq -r '.fellowship_id // .fellowshipId')
echo "Fellowship ID: $FID"
echo ""

if [ "$FID" != "null" ] && [ -n "$FID" ]; then
  echo "3. Get fellowship $FID:"
  curl -s "$API/v1/fellowships/$FID" -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""
  
  echo "✅ API is working!"
else
  echo "❌ Failed to create fellowship"
fi
