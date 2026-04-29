#!/bin/bash

# Add Quiz Questions to Training
# Usage: bash scripts/add-quiz-questions.sh <training_uuid> [api_key]

set -e

# Configuration
TRAINING_UUID="${1:-8775a2dc-a69a-4871-bb5a-0d9a615d87a4}"
API_KEY="${2:-7aeec18d-1529-4483-8475-607d5a16afa7}"
BASE_URL="https://fde-staging.taleemabad.com"
TEMP_DIR="/tmp/taleemabad-cms-quiz"
QUESTIONS_FILE="$TEMP_DIR/quiz_questions.json"
FINAL_FILE="$TEMP_DIR/quiz_questions_final.json"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  📚 Taleemabad Quiz Question Uploader${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create the questions JSON payload
cat > "$QUESTIONS_FILE" << 'EOF'
[
  {
    "type": "mcq",
    "question_statement": "A teacher delivers a well-structured explanation while students listen quietly. At the end, only a few students can answer questions. What does this situation indicate?",
    "options": [
      "Students were fully engaged",
      "Teaching was effective for all learners",
      "Engagement was limited despite instruction",
      "The lesson was too short"
    ],
    "answers": [3],
    "hints": [
      "Students may appear attentive, but listening alone does not guarantee engagement or understanding.",
      "If only a few students can respond, learning has not reached all learners effectively.",
      "This reflects a gap between teaching and actual student engagement and understanding.",
      "The issue is not time, but lack of active involvement."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 1
  },
  {
    "type": "mcq",
    "question_statement": "Which of the following BEST reflects active learning?",
    "options": [
      "Students watching a demonstration",
      "Students solving a problem and explaining their reasoning",
      "Students copying notes",
      "Teacher summarizing key points"
    ],
    "answers": [2],
    "hints": [
      "Watching is passive unless followed by interaction.",
      "Active learning requires thinking, applying, and explaining concepts.",
      "Copying notes does not involve deep thinking.",
      "Teacher summaries are helpful but still teacher-centered."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 2
  },
  {
    "type": "mcq",
    "question_statement": "In GBTLA, what is the correct sequence for designing a lesson?",
    "options": [
      "Select game → Define outcome → Teach",
      "Teach → Play game → Assess",
      "Define outcome → Select activity/game → Implement",
      "Choose technology → Plan activity"
    ],
    "answers": [3],
    "hints": [
      "Starting with a game may lead to poor curriculum alignment.",
      "This approach separates games from teaching.",
      "Learning outcomes guide the activity selection and implementation.",
      "Technology is not the starting point."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 3
  },
  {
    "type": "mcq",
    "question_statement": "Which statement reflects a misunderstanding of GBTLA?",
    "options": [
      "Games replace teaching",
      "Games support learning objectives",
      "Games are integrated within teaching",
      "Games provide feedback"
    ],
    "answers": [1],
    "hints": [
      "GBTLA supports teaching — it does not replace it.",
      "This correctly reflects the purpose of GBTLA.",
      "Integration is a key principle of GBTLA.",
      "Games provide immediate feedback to support learning."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 4
  },
  {
    "type": "mcq",
    "question_statement": "During a game-based activity, a teacher notices student giving incorrect answers. What should the teacher do?",
    "options": [
      "Stop the activity immediately",
      "Ignore mistakes",
      "Provide correct answers instantly",
      "Use the moment to guide understanding"
    ],
    "answers": [4],
    "hints": [
      "Stopping removes a learning opportunity.",
      "Ignoring mistakes prevents learning improvement.",
      "Simply giving answers limits student thinking.",
      "Mistakes should be used to guide and deepen understanding."
    ],
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 5
  },
  {
    "type": "mcq",
    "question_statement": "A teacher uses a short interactive challenge at the beginning of a lesson. What is the purpose?",
    "options": [
      "Assessment only",
      "Entertainment",
      "Activating prior knowledge",
      "Homework replacement"
    ],
    "answers": [3],
    "hints": [
      "While it may informally assess, that is not the main purpose.",
      "The goal is learning, not entertainment.",
      "It helps students recall and connect prior knowledge.",
      "It is part of lesson engagement, not homework."
    ],
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 6
  },
  {
    "type": "msq",
    "question_statement": "Which statements correctly describe GBTLA? (Select all that apply)",
    "options": [
      "Learning outcomes guide activity selection",
      "Games are used as structured learning tools",
      "Teaching, learning, and assessment are integrated",
      "Games are used only after teaching",
      "Teachers facilitate learning during activities"
    ],
    "answers": [1, 2, 3, 5],
    "hints": [
      "Curriculum alignment is the starting point.",
      "Games are structured tools, not random activities.",
      "All three processes happen together.",
      "Games are used before, during, and after learning.",
      "Teachers guide and support learning actively."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 7
  },
  {
    "type": "msq",
    "question_statement": "Which classroom practices reflect active learning? (Select all that apply)",
    "options": [
      "Students discussing answers with peers",
      "Teacher explaining entire lesson",
      "Students applying concepts to solve problems",
      "Students memorizing notes",
      "Students making decisions during tasks"
    ],
    "answers": [1, 3, 5],
    "hints": [
      "Discussion promotes deeper understanding.",
      "This is teacher-centered and passive.",
      "Application shows real understanding.",
      "Memorization alone is not active learning.",
      "Decision-making requires thinking and engagement."
    ],
    "bloom_level": "analyze",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 8
  },
  {
    "type": "msq",
    "question_statement": "How can games be effectively used in a lesson? (Select all that apply)",
    "options": [
      "During learning to support practice",
      "Only at the end as rewards",
      "Before learning to build curiosity",
      "After learning to reinforce understanding",
      "Independently of learning outcomes"
    ],
    "answers": [1, 3, 4],
    "hints": [
      "Games help students practice concepts actively.",
      "Limiting games to rewards reduces their learning value.",
      "Games can spark curiosity and activate thinking.",
      "Games reinforce and assess understanding.",
      "Games must align with learning outcomes."
    ],
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 9
  },
  {
    "type": "msq",
    "question_statement": "A teacher is planning a GBTLA lesson. Which actions are appropriate? (Select all that apply)",
    "options": [
      "Align the activity with curriculum outcomes",
      "Select the most entertaining game available",
      "Observe student responses during the activity",
      "Use games without lesson structure",
      "Encourage discussion and explanation"
    ],
    "answers": [1, 3, 5],
    "hints": [
      "Curriculum alignment ensures meaningful learning.",
      "Engagement alone is not enough without learning focus.",
      "Observation supports formative assessment.",
      "Structure is essential for effective learning.",
      "Discussion deepens understanding."
    ],
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 10
  }
]
EOF

echo -e "${YELLOW}Input:${NC}"
echo -e "  Training UUID: ${TRAINING_UUID}"
echo -e "  API Key: ${API_KEY:0:8}..."
echo -e "  Base URL: ${BASE_URL}"
echo ""

# Step 1: Get training ID
echo -e "${BLUE}📡 Step 1: Fetching training details...${NC}"
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/trainings/?is_active=null&course__uuid=${TRAINING_UUID}" \
  -H "API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo -e "${RED}❌ Error: Invalid response from API${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

# Extract training ID - handle both array and object responses
TRAINING_ID=$(echo "$RESPONSE" | jq -r 'if type == "array" then .[0].id elif .results then .results[0].id else .id end // empty')

if [ -z "$TRAINING_ID" ] || [ "$TRAINING_ID" = "null" ]; then
  echo -e "${RED}❌ Error: Could not find training with UUID: ${TRAINING_UUID}${NC}"
  echo "API Response:"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Training ID found: ${TRAINING_ID}${NC}"
echo ""

# Step 2: Prepare payload with training ID
echo -e "${BLUE}📝 Step 2: Preparing payload with training ID...${NC}"
cp "$QUESTIONS_FILE" "$FINAL_FILE"
sed -i "s/TRAINING_ID_HERE/${TRAINING_ID}/g" "$FINAL_FILE"
echo -e "${GREEN}✅ Payload prepared${NC}"
echo ""

# Step 3: Upload questions
echo -e "${BLUE}🚀 Step 3: Uploading 10 questions...${NC}"
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
    echo -e "${BLUE}Response summary:${NC}"
    echo "$UPLOAD_RESPONSE" | jq -r '.[] | "\(.id): \(.question_statement[0:60])..."' | head -5
    echo ""
    echo -e "${GREEN}✨ All done! Questions are now in your training.${NC}"
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
