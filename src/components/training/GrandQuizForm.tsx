import { useForm } from "react-hook-form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useCreateGrandQuiz, useUpdateGrandQuiz } from "../../hooks/useGrandQuizzes"
import { useLevels } from "../../hooks/useLevels"
import type { GrandQuiz } from "../../types"
import { useToast } from "../../hooks/use-toast"

interface FormValues {
  title: string
  description: string
  instructions: string
  type: string
  level: string
}

interface Props {
  quiz?: GrandQuiz
  onSuccess?: () => void
}

export default function GrandQuizForm({ quiz, onSuccess }: Props) {
  const { data: levels = [] } = useLevels()
  const create = useCreateGrandQuiz()
  const update = useUpdateGrandQuiz()
  const { toast } = useToast()
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: quiz
      ? { title: quiz.title, description: quiz.description ?? "", instructions: quiz.instructions ?? "", type: quiz.type, level: String(quiz.level) }
      : { type: "grand_quiz" }
  })

  const onSubmit = async (values: FormValues) => {
    const payload = { ...values, level: Number(values.level), is_active: true }
    try {
      if (quiz) await update.mutateAsync({ id: quiz.id, data: payload })
      else await create.mutateAsync(payload)
      toast({ title: quiz ? "Grand Quiz updated" : "Grand Quiz created" })
      reset()
      onSuccess?.()
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message, variant: "destructive" })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-lg p-4 mb-4 space-y-4">
      <h3 className="font-semibold">{quiz ? "Edit Grand Quiz" : "Add Grand Quiz"}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Title</Label>
          <Input {...register("title", { required: true })} />
        </div>
        <div>
          <Label>Type</Label>
          <Select onValueChange={v => setValue("type", v)} defaultValue={watch("type")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grand_quiz">Grand Quiz</SelectItem>
              <SelectItem value="diagnostic">Diagnostic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Level</Label>
          <Select onValueChange={v => setValue("level", v)} defaultValue={watch("level")}>
            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              {levels.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} rows={2} />
        </div>
        <div className="col-span-2">
          <Label>Instructions</Label>
          <Textarea {...register("instructions")} rows={2} />
        </div>
      </div>
      <Button type="submit" disabled={create.isPending || update.isPending}>
        {quiz ? "Update" : "Create"}
      </Button>
    </form>
  )
}
