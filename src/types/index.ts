export interface Org {
  id: string
  name: string
  publisher: string
  stage_url: string
  prod_url: string
}

export interface Level {
  id: number
  name: string
  description: string
  order: number
  passing_score: number
  max_attempts: number
  time_limit: number | null
  vendor: string
}

export interface Course {
  id: number
  uuid: string
  title: string
  description: string | null
  keywords: string[] | null
  time_duration: number
  index: number
  thumbnail_url: string | null
  is_active: boolean
  status: string
  type: string
  level: number
  grade_group: number | null
  trainings_count: number
  subject_id: number | null
  created: string
  modified: string
}

export interface Training {
  id: number
  uuid: string
  course: number
  course_uuid: string
  title: string
  description: string | null
  content: string | null
  media_asset: MediaAsset | null
  index: number
  is_grand_assessment: boolean
  is_active: boolean
  status: string
  tags: string[]
  duration: number
  created: string
  modified: string
  // local-only staging field
  _local_status?: "New" | "existing"
}

export interface Question {
  id: number
  uuid: string
  training: number | null
  grand_quiz: number | null
  course: number | null
  index: number
  type: "mcq" | "msq" | "open-ended" | "poll"
  question_statement: string
  options: string[]
  answers: number[]
  hints: string[]
  hint: string | null
  bloom_level: string
  statement_media_asset: MediaAsset | null
  statement_media_asset_id: number | null
  is_active: boolean
  status: string
  created: string
  modified: string
  // local-only staging field
  _local_status?: "New" | "existing"
}

export interface GrandQuiz {
  id: number
  uuid: string
  title: string
  description: string
  instructions: string
  type: string
  level: number
  is_active: boolean
  status: string
  media_asset: MediaAsset | null
  created: string
  modified: string
}

export interface MediaAsset {
  id: number
  uuid: string
  name: string
  type: "video" | "audio" | "image" | "pdf"
  category: string[]
  url: string
  s3_url: string
  temp_url: string | null
  hls_video_main_manifest_url: string | null
  description: string
  status: string
  is_active: boolean
  created: string
  modified: string
}

export const COURSE_TYPES = [
  { value: "PEDAGOGICAL_PRACTICE", label: "Pedagogical Practice" },
  { value: "CONTENT_EXPERTISE", label: "Content Expertise" },
  { value: "ASSESSMENT_FEEDBACK", label: "Assessment & Feedback" },
  { value: "INCLUSIVE_EDUCATION", label: "Inclusive Education" },
  { value: "DIGITAL_LITERACY", label: "Digital Literacy" },
  { value: "CLASSROOM_MANAGEMENT", label: "Classroom Management" },
  { value: "PROFESSIONAL_GROWTH_ETHICS", label: "Professional Growth & Ethics" },
  { value: "CHARACTER_EDUCATION", label: "Character Education" },
  { value: "EARLY_YEARS", label: "Early Years" },
  { value: "FLN", label: "FLN" },
  { value: "GENERAL", label: "General" },
  { value: "SUBJECT", label: "Subject" },
]

// Course types available per vendor
export const VENDOR_COURSE_TYPES: Record<string, typeof COURSE_TYPES> = {
  TALEEMABAD: COURSE_TYPES,
  BEACONHOUSE: COURSE_TYPES.filter(t => t.value === "PEDAGOGICAL_PRACTICE"),
  NIETE: COURSE_TYPES.filter(t => t.value === "PEDAGOGICAL_PRACTICE"),
}

export const QUESTION_TYPES = [
  { value: "mcq", label: "MCQ" },
  { value: "msq", label: "MSQ" },
  { value: "open-ended", label: "Open Ended" },
  { value: "mcq-assets", label: "MCQ + Media" },
  { value: "msq-assets", label: "MSQ + Media" },
]

export const BLOOM_LEVELS = [
  "remember", "understand", "apply", "analyze", "evaluate", "create"
]

export const ASSET_TYPES = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF" },
]

export const ASSET_CATEGORIES = [
  { value: "teacher_training", label: "Teacher Training" },
  { value: "lesson_plan", label: "Lesson Plan" },
  { value: "book", label: "Book" },
  { value: "assessment", label: "Assessment" },
]
