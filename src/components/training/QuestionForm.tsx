import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useTrainingStore } from "../../store/trainingStore"
import { useAssessmentAssets } from "../../hooks/useMediaAssets"
import { useCreateQuestions, useUpdateQuestion } from "../../hooks/useQuestions"
import { useUpdateCourse } from "../../hooks/useCourses"
import { useToast } from "../../hooks/use-toast"
import { QUESTION_TYPES, BLOOM_LEVELS } from "../../types"
import type { Question } from "../../types"

interface FormValues {
  statement: string
  type: string
  bloom_level: string
  option1: string; option2: string; option3: string; option4: string
  option5: string; option6: string
  answer1: string; answer2: string; answer3: string; answer4: string
  hint1: string; hint2: string
  media_asset_id: string
}

interface Props {
  grandQuizMode?: boolean
  question?: Question   // if provided → edit mode
  onSuccess?: () => void
}

export default function QuestionForm({ grandQuizMode, question, onSuccess }: Props) {
  const { trainingCtx, grandQuizCtx, courseCtx } = useTrainingStore()
  const { data: assessmentAssets = [] } = useAssessmentAssets()
  const createQuestions = useCreateQuestions()
  const updateQuestion = useUpdateQuestion()
  const updateCourse = useUpdateCourse()
  const { toast } = useToast()
  const [open, setOpen] = useState(!!question)

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: question
      ? {
          statement: question.question_statement,
          type: question.type,
          bloom_level: question.bloom_level,
          option1: question.options?.[0] ?? "",
          option2: question.options?.[1] ?? "",
          option3: question.options?.[2] ?? "",
          option4: question.options?.[3] ?? "",
          option5: question.options?.[4] ?? "",
          option6: question.options?.[5] ?? "",
          answer1: String(question.answers?.[0] ?? ""),
          answer2: String(question.answers?.[1] ?? ""),
          answer3: String(question.answers?.[2] ?? ""),
          answer4: String(question.answers?.[3] ?? ""),
          hint1: question.hints?.[0] ?? "",
          hint2: question.hints?.[1] ?? "",
          media_asset_id: question.statement_media_asset_id ? String(question.statement_media_asset_id) : "",
        }
      : { type: "mcq", bloom_level: "remember" }
  })

  const qType = watch("type")
  const showOptions = ["mcq", "msq", "mcq-assets", "msq-assets"].includes(qType)
  const showMedia = ["mcq-assets", "msq-assets"].includes(qType)
  const isMulti = ["msq", "msq-assets"].includes(qType)

  if (!open) return (
    <Button variant="outline" className="mb-4" onClick={() => setOpen(true)}>
      + Add Question
    </Button>
  )

  const onSubmit = async (values: FormValues) => {
    const normalizedType = qType.replace("-assets", "") as Question["type"]
    const options = [values.option1, values.option2, values.option3, values.option4, values.option5, values.option6].filter(Boolean)
    const answers = isMulti
      ? [values.answer1, values.answer2, values.answer3, values.answer4].filter(Boolean).map(Number)
      : values.answer1 ? [Number(values.answer1)] : []
    const hints = [values.hint1, values.hint2].filter(Boolean)

    const payload = {
      type: normalizedType,
      question_statement: values.statement,
      options,
      answers,
      hints,
      hint: hints.join("\n") || null,
      bloom_level: values.bloom_level,
      statement_media_asset: showMedia && values.media_asset_id ? Number(values.media_asset_id) : null,
      is_active: true,
      status: "ReadyForReview",
    }

    try {
      if (question) {
        await updateQuestion.mutateAsync({ id: question.id, data: payload })
        toast({ title: "Question updated" })
      } else {
        const createPayload = {
          ...payload,
          training: grandQuizMode ? null : (trainingCtx?.id ?? null),
          grand_quiz: grandQuizMode ? (grandQuizCtx?.id ?? null) : null,
          index: 1,
        }
        await createQuestions.mutateAsync([createPayload])
        toast({ title: "Question saved" })
        reset()
        setOpen(false)
        // OnProd auto-reset
        if (!grandQuizMode && courseCtx?.status === "OnProd") {
          await updateCourse.mutateAsync({ id: courseCtx.id, data: { status: "ReadyForReview" } })
        }
      }
      onSuccess?.()
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message, variant: "destructive" })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-lg p-4 mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{question ? "Edit Question" : "Add Question"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); onSuccess?.() }}>✕</Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select onValueChange={v => setValue("type", v)} defaultValue={qType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Bloom Level</Label>
          <Select onValueChange={v => setValue("bloom_level", v)} defaultValue={watch("bloom_level")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BLOOM_LEVELS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Question Statement</Label>
          <Textarea {...register("statement", { required: true })} rows={2} />
        </div>
        {showMedia && (
          <div className="col-span-2">
            <Label>Statement Media Asset</Label>
            <select {...register("media_asset_id")} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">-- None --</option>
              {assessmentAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        {showOptions && (
          <>
            {[1,2,3,4,5,6].map(i => (
              <div key={i}>
                <Label>Option {i}</Label>
                <Input {...register(`option${i}` as keyof FormValues)} />
              </div>
            ))}
            {isMulti ? (
              [1,2,3,4].map(i => (
                <div key={i}>
                  <Label>Answer {i} (option #)</Label>
                  <Input {...register(`answer${i}` as keyof FormValues)} type="number" />
                </div>
              ))
            ) : (
              <div>
                <Label>Correct Answer (option #)</Label>
                <Input {...register("answer1")} type="number" />
              </div>
            )}
          </>
        )}
        <div>
          <Label>Hint 1</Label>
          <Input {...register("hint1")} />
        </div>
        <div>
          <Label>Hint 2</Label>
          <Input {...register("hint2")} />
        </div>
      </div>
      <Button type="submit" disabled={createQuestions.isPending || updateQuestion.isPending}>
        {question ? "Update" : "Save Question"}
      </Button>
    </form>
  )
}
