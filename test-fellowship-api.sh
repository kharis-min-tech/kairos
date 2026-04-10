#!/bin/bash

# Fellowship API Test Script
# This script tests all fellowship endpoints

API_URL="https://fiozyca9ah.execute-api.eu-west-2.amazonaws.com"
USER_POOL_ID="eu-west-2_pcXtxTuhu"
CLIENT_ID="51g4egqn15ukgho80mbgsdi5r3"

echo "🚀 Fellowship API Test Script"
echo "=============================="
echo ""

# Check if we have a token already
if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ No AUTH_TOKEN found!"
  echo ""
  echo "To get a token, you need to:"
  echo "1. Create a user in Cognito (or use existing)"
  echo "2. Get a JWT token"
  echo ""
  echo "Quick way to create a test user:"
  echo "aws cognito-idp admin-create-user \\"
  echo "  --user-pool-id $USER_POOL_ID \\"
  echo "  --username testuser@example.com \\"
  echo "  --temporary-password TempPass123! \\"
  echo "  --user-attributes Name=email,Value=testuser@example.com \\"
  echo "  --region eu-west-2"
  echo ""
  echo "Then set password:"
  echo "aws cognito-idp admin-set-user-password \\"
  echo "  --user-pool-id $USER_POOL_ID \\"
  echo "  --username testuser@example.com \\"
  echo "  --password MyPassword123! \\"
  echo "  --permanent \\"
  echo "  --region eu-west-2"
  echo ""
  echo "Then get token:"
  echo "aws cognito-idp initiate-auth \\"
  echo "  --auth-flow USER_PASSWORD_AUTH \\"
  echo "  --client-id $CLIENT_ID \\"
  echo "  --auth-parameters USERNAME=testuser@example.com,PASSWORD=MyPassword123! \\"
  echo "  --region eu-west-2 \\"
  echo "  --query 'AuthenticationResult.IdToken' \\"
  echo "  --output text"
  echo ""
  echo "Then run this script with:"
  echo "export AUTH_TOKEN='your-token-here'"
  echo "./test-fellowship-api.sh"
  exit 1
fi

echo "✅ AUTH_TOKEN found"
echo ""

# Test 1: List fellowships
echo "📋 Test 1: List Fellowships"
echo "GET $API_URL/v1/fellowships"
curl -s -X GET "$API_URL/v1/fellowships" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

# Test 2: Create fellowship
echo "📝 Test 2: Create Fellowship"
echo "POST $API_URL/v1/fellowships"
FELLOWSHIP_RESPONSE=$(curl -s -X POST "$API_URL/v1/fellowships" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fellowship_name": "Test K-Group",
    "fellowship_type": "K-Groups",
    "description": "Test fellowship for API testing",
    "branch_id": 1,
    "meeting_schedule": "Wednesdays 7:00 PM",
    "location": "Church Hall"
  }')
echo "$FELLOWSHIP_RESPONSE" | jq '.'
FELLOWSHIP_ID=$(echo "$FELLOWSHIP_RESPONSE" | jq -r '.fellowship_id // .fellowshipId // empty')
echo ""
echo "Fellowship ID: $FELLOWSHIP_ID"
echo "---"
echo ""

if [ -z "$FELLOWSHIP_ID" ]; then
  echo "❌ Failed to create fellowship. Stopping tests."
  exit 1
fi

# Test 3: Get fellowship
echo "🔍 Test 3: Get Fellowship"
echo "GET $API_URL/v1/fellowships/$FELLOWSHIP_ID"
curl -s -X GET "$API_URL/v1/fellowships/$FELLOWSHIP_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

# Test 4: Update fellowship
echo "✏️  Test 4: Update Fellowship"
echo "PUT $API_URL/v1/fellowships/$FELLOWSHIP_ID"
curl -s -X PUT "$API_URL/v1/fellowships/$FELLOWSHIP_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description for testing",
    "meeting_schedule": "Thursdays 6:30 PM"
  }' | jq '.'
echo ""
echo "---"
echo ""

# Test 5: Create meeting
echo "📅 Test 5: Create Meeting"
echo "POST $API_URL/v1/fellowships/$FELLOWSHIP_ID/meetings"
MEETING_RESPONSE=$(curl -s -X POST "$API_URL/v1/fellowships/$FELLOWSHIP_ID/meetings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"fellowship_id\": $FELLOWSHIP_ID,
    \"meeting_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"meeting_title\": \"Weekly Fellowship\",
    \"meeting_topic\": \"Prayer and Worship\",
    \"location\": \"Church Hall\",
    \"duration_minutes\": 90
  }")
echo "$MEETING_RESPONSE" | jq '.'
MEETING_ID=$(echo "$MEETING_RESPONSE" | jq -r '.meeting_id // .meetingId // empty')
echo ""
echo "Meeting ID: $MEETING_ID"
echo "---"
echo ""

# Test 6: List meetings
echo "📋 Test 6: List Meetings"
echo "GET $API_URL/v1/fellowships/$FELLOWSHIP_ID/meetings"
curl -s -X GET "$API_URL/v1/fellowships/$FELLOWSHIP_ID/meetings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

if [ ! -z "$MEETING_ID" ]; then
  # Test 7: Get meeting
  echo "🔍 Test 7: Get Meeting"
  echo "GET $API_URL/v1/fellowships/$FELLOWSHIP_ID/meetings/$MEETING_ID"
  curl -s -X GET "$API_URL/v1/fellowships/$FELLOWSHIP_ID/meetings/$MEETING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" | jq '.'
  echo ""
  echo "---"
  echo ""
fi

echo "✅ All tests completed!"
echo ""
echo "Summary:"
echo "- Fellowship ID: $FELLOWSHIP_ID"
echo "- Meeting ID: $MEETING_ID"
echo ""
echo "Note: Some tests may fail if you don't have the required data (branch, members, etc.)"
