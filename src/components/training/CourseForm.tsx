import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useLevels } from "../../hooks/useLevels"
import { useCreateCourse, useUpdateCourse } from "../../hooks/useCourses"
import { splitKeywords } from "../../lib/utils"
import { COURSE_TYPES } from "../../types"
import type { Course } from "../../types"
import { useToast } from "../../hooks/use-toast"

interface Props {
  course?: Course       // if provided → edit mode
  onSuccess?: () => void
}

interface FormValues {
  title: string
  type: string
  level: string
  index: string
  keywords: string
  time_duration: string
  description: string
  thumbnail_url: string
}

export default function CourseForm({ course, onSuccess }: Props) {
  const { data: levels = [] } = useLevels()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const { toast } = useToast()
  const [open, setOpen] = useState(!course)

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: course
      ? {
          title: course.title,
          type: course.type,
          level: String(course.level),
          index: String(course.index),
          keywords: course.keywords?.join(", ") ?? "",
          time_duration: String(course.time_duration),
          description: course.description ?? "",
          thumbnail_url: course.thumbnail_url ?? "",
        }
      : { type: "PEDAGOGICAL_PRACTICE", level: "", time_duration: "1", index: "1" },
  })

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      type: values.type,
      level: Number(values.level),
      index: Number(values.index),
      keywords: values.keywords ? splitKeywords(values.keywords) : null,
      time_duration: Number(values.time_duration) || 1,
      description: values.description || null,
      thumbnail_url: values.thumbnail_url || null,
      status: "ReadyForReview",
      is_active: "True",
    }

    try {
      if (course) {
        await updateCourse.mutateAsync({ id: course.id, data: payload })
        toast({ title: "Course updated" })
      } else {
        await createCourse.mutateAsync(payload)
        toast({ title: "Course created" })
        reset()
        setOpen(false)
      }
      onSuccess?.()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ title: "Error", description: message ?? "Something went wrong", variant: "destructive" })
    }
  }

  if (!course && !open) {
    return (
      <Button variant="outline" className="mb-4" onClick={() => setOpen(true)}>
        + Add Course
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-lg p-4 mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{course ? "Edit Course" : "Add Course"}</h3>
        {!course && <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>✕</Button>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Title</Label>
          <Input {...register("title", { required: true })} placeholder="Course title" />
        </div>
        <div>
          <Label>Type</Label>
          <Select onValueChange={v => setValue("type", v)} defaultValue={watch("type")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COURSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
        <div>
          <Label>Index</Label>
          <Input {...register("index")} type="number" />
        </div>
        <div>
          <Label>Duration (hrs)</Label>
          <Input {...register("time_duration")} type="number" />
        </div>
        <div className="col-span-2">
          <Label>Keywords (comma separated)</Label>
          <Input {...register("keywords")} placeholder="keyword1, keyword2" />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} rows={2} />
        </div>
        <div className="col-span-2">
          <Label>Thumbnail URL</Label>
          <Input {...register("thumbnail_url")} placeholder="https://..." />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={createCourse.isPending || updateCourse.isPending}>
          {course ? "Update" : "Create Course"}
        </Button>
      </div>
    </form>
  )
}
