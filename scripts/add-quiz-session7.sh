#!/bin/bash

# Add Quiz Questions - Session 7: Game-Based Teaching & Learning Approaches (GBTLA)
# Usage: bash scripts/add-quiz-session7.sh <training_uuid> [api_key]

set -e

# Configuration
TRAINING_ID="${1:-926}"
API_KEY="${2:-7aeec18d-1529-4483-8475-607d5a16afa7}"
BASE_URL="https://fde-staging.taleemabad.com"
TEMP_DIR="/tmp/taleemabad-cms-quiz"
QUESTIONS_FILE="$TEMP_DIR/quiz_session7.json"
FINAL_FILE="$TEMP_DIR/quiz_session7_final.json"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  📚 Session 7: GBTLA Advanced Topics${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load questions from JSON file
cp "scripts/quiz_session7_training926.json" "$QUESTIONS_FILE"

echo -e "${YELLOW}Input:${NC}"
echo -e "  Training ID: ${TRAINING_ID}"
echo -e "  API Key: ${API_KEY:0:8}..."
echo -e "  Base URL: ${BASE_URL}"
echo ""

# Step 1: Verify training exists
echo -e "${BLUE}📡 Step 1: Verifying training ${TRAINING_ID}...${NC}"
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/trainings/${TRAINING_ID}/" \
  -H "API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo -e "${RED}❌ Error: Invalid response from API${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

# Extract training name to verify it exists
TRAINING_NAME=$(echo "$RESPONSE" | jq -r '.name // .title // empty')

if [ -z "$TRAINING_NAME" ] || [ "$TRAINING_NAME" = "null" ]; then
  echo -e "${RED}❌ Error: Could not find training with ID: ${TRAINING_ID}${NC}"
  echo "API Response:"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Training verified: ${TRAINING_NAME}${NC}"
echo ""

# Step 2: Prepare payload with training ID
echo -e "${BLUE}📝 Step 2: Preparing payload with training ID...${NC}"
cp "$QUESTIONS_FILE" "$FINAL_FILE"
sed -i "s/TRAINING_ID_HERE/${TRAINING_ID}/g" "$FINAL_FILE"
echo -e "${GREEN}✅ Payload prepared${NC}"
echo ""

# Step 3: Upload questions
echo -e "${BLUE}🚀 Step 3: Uploading 10 questions...${NC}"
echo -e "   • 6 MCQ (Single Answer) @ 2 marks each = 12 marks"
echo -e "   • 4 MSQ (Multiple Selection) @ 3-4 marks each = 13 marks"
echo -e "   • Total: 25 marks | Passing: 70% (18/25)"
echo ""

UPLOAD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/internal/training_question/" \
  -H "API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"$FINAL_FILE")

# Check if upload was successful
if echo "$UPLOAD_RESPONSE" | jq empty 2>/dev/null; then
  QUESTION_COUNT=$(echo "$UPLOAD_RESPONSE" | jq 'length')
  if [ "$QUESTION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Successfully uploaded ${QUESTION_COUNT} questions!${NC}"
    echo ""
    echo -e "${BLUE}📊 Quiz Configuration:${NC}"
    echo -e "  ${GREEN}✓${NC} Total Questions: 10"
    echo -e "  ${GREEN}✓${NC} MCQ (Single Answer): 6 × 2 marks = 12 marks"
    echo -e "  ${GREEN}✓${NC} MSQ (Multiple Selection): 4 × 3-4 marks = 13 marks"
    echo -e "  ${GREEN}✓${NC} Total Marks: 25"
    echo -e "  ${GREEN}✓${NC} Passing Score: 70% (Minimum 18 marks required)"
    echo -e "  ${GREEN}✓${NC} Scoring: Partial matching for MSQ (correct options earn marks, incorrect = zero)"
    echo ""
    echo -e "${BLUE}Topics Covered:${NC}"
    echo -e "  • Game-Based Teaching & Learning Approaches (GBTLA)"
    echo -e "  • The 5E Learning Model (Engage, Explore, Explain, Elaborate, Evaluate)"
    echo -e "  • Board Games in Learning"
    echo -e "  • Google Forms for Assessment"
    echo -e "  • Time-Bound Challenges & Collaboration"
    echo -e "  • Teacher Facilitation Strategies"
    echo ""
    echo -e "${BLUE}Response summary:${NC}"
    echo "$UPLOAD_RESPONSE" | jq -r '.[] | "  #\(.index): \(.type | ascii_upcase) — \(.question_statement[0:55])..."' | head -10
    echo ""
    echo -e "${GREEN}✨ Session 7 questions are now in your training!${NC}"
  else
    echo -e "${YELLOW}⚠️  Response received but check upload status${NC}"
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
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Test the quiz in the training page"
echo -e "  2. Verify scoring rules (partial matching for MSQ)"
echo -e "  3. Run learners through assessment"
echo -e "  4. Monitor quiz completion and pass rates"
echo -e "${BLUE}========================================${NC}"
