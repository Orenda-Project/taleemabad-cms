#!/bin/bash

# Update Quiz Questions for Training
# Usage: bash scripts/update-quiz-questions.sh <training_id> [api_key]
# Example: bash scripts/update-quiz-questions.sh 926 7aeec18d-1529-4483-8475-607d5a16afa7

set -e

# Configuration
TRAINING_ID="${1:-926}"
API_KEY="${2:-7aeec18d-1529-4483-8475-607d5a16afa7}"
BASE_URL="https://fde-staging.taleemabad.com"
TEMP_DIR="/tmp/taleemabad-cms-update-quiz"
QUESTIONS_FILE="$TEMP_DIR/quiz_questions.json"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  📚 Taleemabad Quiz Question Updater${NC}"
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
    "marks": 2,
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 1,
    "scoring_type": "standard"
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
    "marks": 4,
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 2,
    "scoring_type": "partial_matching"
  },
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
    "marks": 2,
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 3,
    "scoring_type": "standard"
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
    "marks": 2,
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 4,
    "scoring_type": "standard"
  },
  {
    "type": "mcq",
    "question_statement": "A teacher wants students to understand a process (e.g., water cycle). Which offline game is most suitable?",
    "options": [
      "Sequencing cards",
      "Bingo",
      "Matching cards",
      "Quiz competition"
    ],
    "answers": [1],
    "hints": [
      "Sequencing helps students understand steps in order.",
      "Bingo focuses on recall, not processes.",
      "Matching focuses on relationships, not sequence.",
      "This is better for review than conceptual understanding."
    ],
    "marks": 2,
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 5,
    "scoring_type": "standard"
  },
  {
    "type": "msq",
    "question_statement": "Which features describe effective use of board games in learning? (Select all that apply)",
    "options": [
      "Students move by solving questions",
      "Students collaborate and discuss answers",
      "Students move randomly without thinking",
      "Students engage with lesson concepts",
      "Students memorize without interaction"
    ],
    "answers": [1, 2, 4],
    "hints": [
      "Movement should be linked to learning tasks.",
      "Collaboration strengthens understanding.",
      "Random movement removes learning value.",
      "Activities must connect to lesson concepts.",
      "Memorization alone is not active learning."
    ],
    "marks": 3,
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 6,
    "scoring_type": "partial_matching"
  },
  {
    "type": "msq",
    "question_statement": "Which statements describe the use of Google Forms in GBTLA? (Select all that apply)",
    "options": [
      "They are linked to lesson plans on LMS",
      "Teachers must create them from scratch",
      "They provide quick assessment of understanding",
      "Responses are recorded automatically",
      "They are only used for homework"
    ],
    "answers": [1, 3, 4],
    "hints": [
      "Forms are provided within LMS for each lesson.",
      "Teachers are not required to create them independently.",
      "They help quickly assess learning outcomes.",
      "Responses are automatically collected and stored.",
      "They are used for assessment, not limited to homework."
    ],
    "marks": 3,
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 7,
    "scoring_type": "partial_matching"
  },
  {
    "type": "mcq",
    "question_statement": "A teacher introduces a challenge where students must complete tasks within a time limit. What is the main benefit?",
    "options": [
      "Reduces workload",
      "Increases competition only",
      "Helps maintain focus and attention",
      "Eliminates discussion"
    ],
    "answers": [3],
    "hints": [
      "Time-bound tasks are not about workload reduction.",
      "Competition may occur, but focus is the key benefit.",
      "Time limits keep students focused and engaged.",
      "Discussion should still be encouraged."
    ],
    "marks": 2,
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 8,
    "scoring_type": "standard"
  },
  {
    "type": "mcq",
    "question_statement": "During a group-based activity, students help each other solve problems. This is an example of:",
    "options": [
      "Passive learning",
      "Collaboration",
      "Individual learning",
      "Testing"
    ],
    "answers": [2],
    "hints": [
      "Students are actively involved.",
      "Working together reflects collaboration.",
      "This is not individual work.",
      "This is learning, not testing."
    ],
    "marks": 2,
    "bloom_level": "understand",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 9,
    "scoring_type": "standard"
  },
  {
    "type": "mcq",
    "question_statement": "A teacher observes that students are off-task during an activity. What is the best response?",
    "options": [
      "Stop the activity",
      "Ignore behaviour",
      "Introduce structure and clear rules",
      "Move to next topic"
    ],
    "answers": [3],
    "hints": [
      "The activity can be improved instead of stopped.",
      "Ignoring behaviour worsens the issue.",
      "Structure helps guide behaviour.",
      "This avoids the problem."
    ],
    "marks": 2,
    "bloom_level": "apply",
    "is_active": true,
    "status": "ReadyForReview",
    "index": 10,
    "scoring_type": "standard"
  }
]
EOF

echo -e "${YELLOW}Input:${NC}"
echo -e "  Training ID: ${TRAINING_ID}"
echo -e "  API Key: ${API_KEY:0:8}..."
echo -e "  Base URL: ${BASE_URL}"
echo ""

# Step 1: Verify training exists
echo -e "${BLUE}📡 Step 1: Verifying training...${NC}"
TRAINING_CHECK=$(curl -s -X GET "${BASE_URL}/api/v1/trainings/${TRAINING_ID}/" \
  -H "API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json")

if ! echo "$TRAINING_CHECK" | jq empty 2>/dev/null; then
  echo -e "${RED}❌ Error: Invalid response from API${NC}"
  echo "Response: $TRAINING_CHECK"
  exit 1
fi

TRAINING_NAME=$(echo "$TRAINING_CHECK" | jq -r '.name // .title // empty')
if [ -z "$TRAINING_NAME" ] || [ "$TRAINING_NAME" = "null" ]; then
  echo -e "${RED}❌ Error: Training with ID ${TRAINING_ID} not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Training verified: ${TRAINING_NAME}${NC}"
echo ""

# Step 2: Check and delete existing questions (optional)
echo -e "${BLUE}📋 Step 2: Checking for existing questions...${NC}"
EXISTING_QUESTIONS=$(curl -s -X GET "${BASE_URL}/api/v1/training_question/?training=${TRAINING_ID}" \
  -H "API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json")

QUESTION_COUNT=$(echo "$EXISTING_QUESTIONS" | jq 'if type == "array" then length elif .results then .results | length else 0 end')

if [ "$QUESTION_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}ℹ️  Found ${QUESTION_COUNT} existing questions${NC}"
  echo -e "${YELLOW}Updating questions...${NC}"
else
  echo -e "${GREEN}ℹ️  No existing questions found - adding new ones${NC}"
fi
echo ""

# Step 3: Upload new questions
echo -e "${BLUE}🚀 Step 3: Uploading 10 questions (Total Marks: 25)...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/internal/training_question/" \
  -H "API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(sed "s/TRAINING_ID_HERE/${TRAINING_ID}/g" < "$QUESTIONS_FILE")")

# Check if upload was successful
if echo "$UPLOAD_RESPONSE" | jq empty 2>/dev/null; then
  UPLOADED_COUNT=$(echo "$UPLOAD_RESPONSE" | jq 'if type == "array" then length else 0 end')
  if [ "$UPLOADED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Successfully uploaded ${UPLOADED_COUNT} questions!${NC}"
    echo ""
    echo -e "${BLUE}📊 Quiz Configuration Summary:${NC}"
    echo -e "  ${GREEN}✓${NC} Total Questions: 10"
    echo -e "  ${GREEN}✓${NC} MCQ (Single Answer): 6"
    echo -e "  ${GREEN}✓${NC} MSQ (Multiple Selection): 4"
    echo -e "  ${GREEN}✓${NC} Total Marks: 25"
    echo -e "  ${GREEN}✓${NC} Passing Score: 70% (18/25 marks)"
    echo -e "  ${GREEN}✓${NC} Scoring: Partial matching for MSQ"
    echo ""
    echo -e "${BLUE}Question Details:${NC}"
    echo "$UPLOAD_RESPONSE" | jq -r '.[] | "  #\(.index): \(.type | ascii_upcase) — \(.question_statement[0:50])..." | head -5'
    echo ""
    echo -e "${GREEN}✨ Quiz setup complete! Ready for learner assessment.${NC}"
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
echo -e "  2. Verify question formatting and options"
echo -e "  3. Run learner through the quiz assessment"
echo -e "  4. Monitor results for any issues"
echo -e "${BLUE}========================================${NC}"
