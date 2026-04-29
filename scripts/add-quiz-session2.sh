#!/bin/bash

# Add Quiz Questions - Session 2: Implementation of GBTLA
# Usage: bash scripts/add-quiz-session2.sh <training_uuid> [api_key]

set -e

# Configuration
TRAINING_UUID="${1:-e10e25db-e24e-4d4c-938f-69c39ddc9437}"
API_KEY="${2:-7aeec18d-1529-4483-8475-607d5a16afa7}"
BASE_URL="https://fde-staging.taleemabad.com"
TEMP_DIR="/tmp/taleemabad-cms-quiz"
QUESTIONS_FILE="$TEMP_DIR/quiz_session2.json"
FINAL_FILE="$TEMP_DIR/quiz_session2_final.json"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  📚 Session 2: GBTLA Implementation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create the questions JSON payload
cat > "$QUESTIONS_FILE" << 'EOF'
[
  {
    "type": "mcq",
    "question_statement": "A teacher selects a game first and then tries to adjust the lesson around it. What is the issue in this approach?",
    "options": [
      "The activity will take more time",
      "The lesson may not align with learning outcomes",
      "Students may not enjoy the activity",
      "The game may be too difficult"
    ],
    "answers": [2],
    "hints": [
      "Time may vary, but the core issue is not time — it is alignment with learning goals.",
      "In GBTLA, lessons must start from learning outcomes. Choosing a game first risks misalignment with curriculum objectives.",
      "Enjoyment is not the main concern; learning alignment is.",
      "Difficulty is not the core issue here."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 1
  },
  {
    "type": "mcq",
    "question_statement": "What is the primary purpose of a GBTLA lesson plan?",
    "options": [
      "To provide games only",
      "To replace teaching methods",
      "To guide structured teaching, learning, and assessment",
      "To reduce teacher involvement"
    ],
    "answers": [3],
    "hints": [
      "Lesson plans are not just about games — they include full teaching structure.",
      "GBTLA supports teaching, not replaces it.",
      "Lesson plans provide a clear roadmap integrating teaching, learning, and assessment.",
      "Teachers remain actively involved throughout the lesson."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 2
  },
  {
    "type": "mcq",
    "question_statement": "During a game-based activity, students are actively playing but not discussing their answers. What should the teacher do?",
    "options": [
      "Allow the activity to continue without interruption",
      "Stop the game completely",
      "Move to assessment",
      "Guide discussion and connect activity to learning"
    ],
    "answers": [4],
    "hints": [
      "Without discussion, learning remains surface-level.",
      "The activity should be improved, not stopped.",
      "Learning needs to be strengthened before assessment.",
      "Discussion helps students explain thinking and deepen understanding."
    ],
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 3
  },
  {
    "type": "mcq",
    "question_statement": "Which stage of the 5E model focuses on students interacting with the activity and exploring ideas?",
    "options": [
      "Engage",
      "Explore",
      "Explain",
      "Evaluate"
    ],
    "answers": [2],
    "hints": [
      "Engage introduces the concept and builds curiosity.",
      "Explore is where students actively interact and investigate concepts.",
      "Explain is where the teacher clarifies and connects ideas.",
      "Evaluate focuses on checking understanding."
    ],
    "bloom_level": "remember",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 4
  },
  {
    "type": "mcq",
    "question_statement": "Which of the following is NOT part of GBTLA implementation support?",
    "options": [
      "Teacher will design games",
      "Lesson plans",
      "Pre-selected games",
      "Tutorial videos"
    ],
    "answers": [1],
    "hints": [
      "In GBTLA, games are already selected and provided — teachers are not required to design them.",
      "Lesson plans are a core part of support.",
      "Games are pre-selected and aligned with curriculum.",
      "Tutorial videos support implementation."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 5
  },
  {
    "type": "mcq",
    "question_statement": "In a classroom with only one screen, how should the teacher implement a game-based activity?",
    "options": [
      "Skip the activity",
      "Let one student play while others watch",
      "Facilitate group discussion and collective responses",
      "Convert it into homework"
    ],
    "answers": [3],
    "hints": [
      "GBTLA is adaptable — activities should not be skipped.",
      "This limits participation to one student.",
      "Whole-class discussion ensures all students participate.",
      "This removes in-class interaction."
    ],
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 6
  },
  {
    "type": "msq",
    "question_statement": "Which components are included in a GBTLA lesson plan? (Select all that apply)",
    "options": [
      "Activity information",
      "Learning outcomes",
      "21st century skills",
      "Game development code",
      "Student attendance"
    ],
    "answers": [1, 2, 3],
    "hints": [
      "Provides lesson context (grade, subject, etc.).",
      "Defines what students should learn.",
      "Builds skills like collaboration and critical thinking.",
      "Teachers are not expected to work with game code — only game instructions are provided.",
      "Attendance is not part of lesson plan structure."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 7
  },
  {
    "type": "msq",
    "question_statement": "Which of the following correctly describe the 5E model stages? (Select all that apply)",
    "options": [
      "Engage activates prior knowledge",
      "Explore allows student interaction and discovery",
      "Explain is where teacher connects learning",
      "Elaborate focuses on applying learning further",
      "Evaluate happens only at the end of the academic term"
    ],
    "answers": [1, 2, 3, 4],
    "hints": [
      "Engage builds curiosity and connects prior knowledge.",
      "Explore involves active investigation.",
      "Explain clarifies understanding.",
      "Elaborate extends learning.",
      "Evaluation happens continuously, not only at the end."
    ],
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 8
  },
  {
    "type": "msq",
    "question_statement": "A teacher is implementing a GBTLA lesson. Which actions reflect effective practice? (Select all that apply)",
    "options": [
      "Following lesson plan structure",
      "Observing student responses during activities",
      "Skipping discussion to save time",
      "Ignore the provided resources from LMS",
      "Aligning activities with learning outcomes"
    ],
    "answers": [1, 2, 5],
    "hints": [
      "Structure ensures effective implementation.",
      "Observation supports formative assessment.",
      "Skipping discussion reduces learning depth.",
      "LMS resources are essential for support.",
      "Alignment ensures meaningful learning."
    ],
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "training": TRAINING_ID_HERE,
    "index": 9
  },
  {
    "type": "msq",
    "question_statement": "A teacher is teaching in two classrooms: One with individual devices, One with only a projector. Which strategies are appropriate? (Select all that apply)",
    "options": [
      "Change learning objectives based on resources",
      "Use individual practice in device classroom",
      "Use group discussion in projector classroom",
      "Skip game in low-resource classroom",
      "Keep lesson plan same, adjust facilitation"
    ],
    "answers": [2, 3, 5],
    "hints": [
      "Learning objectives should remain consistent.",
      "Devices allow individual engagement.",
      "Group discussion ensures participation.",
      "Games should still be implemented with adaptation.",
      "Facilitation changes, not the lesson plan."
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
    echo -e "${GREEN}✨ All done! Session 2 questions are now in your training.${NC}"
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
