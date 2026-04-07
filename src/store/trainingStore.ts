import { create } from "zustand"
import type { Training, Question } from "../types"

interface CourseCtx {
  id: number
  uuid: string
  title: string
  status: string
}

interface TrainingCtx {
  id: number
  uuid: string
  title: string
}

interface GrandQuizCtx {
  id: number
  title: string
}

interface TrainingState {
  courseCtx: CourseCtx | null
  trainingCtx: TrainingCtx | null
  grandQuizCtx: GrandQuizCtx | null

  // locally staged rows (not yet pushed to backend)
  stagedTrainings: Training[]
  stagedQuestions: Question[]
  stagedGrandQuizQuestions: Question[]

  setCourseCtx: (c: CourseCtx) => void
  setTrainingCtx: (t: TrainingCtx) => void
  setGrandQuizCtx: (g: GrandQuizCtx) => void
  clearTrainingCtx: () => void

  addStagedTraining: (t: Training) => void
  clearStagedTrainings: () => void

  addStagedQuestion: (q: Question) => void
  clearStagedQuestions: () => void

  addStagedGrandQuizQuestion: (q: Question) => void
  clearStagedGrandQuizQuestions: () => void
}

export const useTrainingStore = create<TrainingState>()((set) => ({
  courseCtx: null,
  trainingCtx: null,
  grandQuizCtx: null,
  stagedTrainings: [],
  stagedQuestions: [],
  stagedGrandQuizQuestions: [],

  setCourseCtx: (c) => set({ courseCtx: c, trainingCtx: null }),
  setTrainingCtx: (t) => set({ trainingCtx: t }),
  setGrandQuizCtx: (g) => set({ grandQuizCtx: g }),
  clearTrainingCtx: () => set({ trainingCtx: null }),

  addStagedTraining: (t) =>
    set((s) => ({ stagedTrainings: [...s.stagedTrainings, t] })),
  clearStagedTrainings: () => set({ stagedTrainings: [] }),

  addStagedQuestion: (q) =>
    set((s) => ({ stagedQuestions: [...s.stagedQuestions, q] })),
  clearStagedQuestions: () => set({ stagedQuestions: [] }),

  addStagedGrandQuizQuestion: (q) =>
    set((s) => ({ stagedGrandQuizQuestions: [...s.stagedGrandQuizQuestions, q] })),
  clearStagedGrandQuizQuestions: () => set({ stagedGrandQuizQuestions: [] }),
}))
