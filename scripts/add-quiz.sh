#!/bin/bash

# Generic Quiz Uploader - Works with any training ID and question file
# Usage: bash scripts/add-quiz.sh <training_id> <questions_file.json> [api_key]
# Example: bash scripts/add-quiz.sh 921 quiz_session2.json

set -e

# Configuration
TRAINING_ID="${1}"
QUESTIONS_FILE="${2}"
API_KEY="${3:-7aeec18d-1529-4483-8475-607d5a16afa7}"
BASE_URL="https://fde-staging.taleemabad.com"
TEMP_DIR="/tmp/taleemabad-cms-quiz"
FINAL_FILE="$TEMP_DIR/quiz_final.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate inputs
if [ -z "$TRAINING_ID" ]; then
  echo -e "${RED}❌ Error: Training ID is required${NC}"
  echo "Usage: bash scripts/add-quiz.sh <training_id> <questions_file.json> [api_key]"
  echo "Example: bash scripts/add-quiz.sh 921 quiz_session2.json"
  exit 1
fi

if [ -z "$QUESTIONS_FILE" ]; then
  echo -e "${RED}❌ Error: Questions file is required${NC}"
  echo "Usage: bash scripts/add-quiz.sh <training_id> <questions_file.json> [api_key]"
  echo "Example: bash scripts/add-quiz.sh 921 quiz_session2.json"
  exit 1
fi

if [ ! -f "$QUESTIONS_FILE" ]; then
  echo -e "${RED}❌ Error: Questions file not found: ${QUESTIONS_FILE}${NC}"
  exit 1
fi

# Create temp directory
mkdir -p "$TEMP_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  📚 Taleemabad Quiz Question Uploader${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Input:${NC}"
echo -e "  Training ID: ${TRAINING_ID}"
echo -e "  Questions File: ${QUESTIONS_FILE}"
echo -e "  API Key: ${API_KEY:0:8}..."
echo -e "  Base URL: ${BASE_URL}"
echo ""

# Step 1: Prepare payload with training ID
echo -e "${BLUE}📝 Step 1: Preparing payload...${NC}"
cp "$QUESTIONS_FILE" "$FINAL_FILE"
sed -i "s/TRAINING_ID_HERE/${TRAINING_ID}/g" "$FINAL_FILE"

# Validate JSON
if ! jq empty "$FINAL_FILE" 2>/dev/null; then
  echo -e "${RED}❌ Error: Invalid JSON in questions file${NC}"
  exit 1
fi

QUESTION_COUNT=$(jq 'length' "$FINAL_FILE")
echo -e "${GREEN}✅ Payload prepared (${QUESTION_COUNT} questions)${NC}"
echo ""

# Step 2: Upload questions
echo -e "${BLUE}🚀 Step 2: Uploading questions...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/internal/training_question/" \
  -H "API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"$FINAL_FILE")

# Check if upload was successful
if echo "$UPLOAD_RESPONSE" | jq empty 2>/dev/null; then
  CREATED_COUNT=$(echo "$UPLOAD_RESPONSE" | jq 'length')
  if [ "$CREATED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Successfully uploaded ${CREATED_COUNT} questions!${NC}"
    echo ""
    echo -e "${BLUE}📋 Created Questions:${NC}"
    echo "$UPLOAD_RESPONSE" | jq -r '.[] | "  \(.id): \(.question_statement[0:70])..."'
    echo ""
    echo -e "${GREEN}✨ All done! Questions are now in training ${TRAINING_ID}.${NC}"
  else
    echo -e "${YELLOW}⚠️  Response received but no questions created${NC}"
    echo "Full response:"
    echo "$UPLOAD_RESPONSE" | jq '.'
  fi
else
  echo -e "${RED}❌ Error uploading questions${NC}"
  echo "Response:"
  echo "$UPLOAD_RESPONSE"
  exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo -e "${BLUE}========================================${NC}"
