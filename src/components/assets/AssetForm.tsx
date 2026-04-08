import { useForm } from "react-hook-form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useCreateMediaAsset, useUpdateMediaAsset } from "../../hooks/useMediaAssets"
import { ASSET_TYPES, ASSET_CATEGORIES } from "../../types"
import type { MediaAsset } from "../../types"
import { useToast } from "../../hooks/use-toast"

interface FormValues {
  name: string
  type: string
  categories: string[]
  description: string
  url: string
  uuid: string
}

interface Props {
  asset?: MediaAsset
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AssetForm({ asset, onSuccess, onCancel }: Props) {
  const create = useCreateMediaAsset()
  const update = useUpdateMediaAsset()
  const { toast } = useToast()
  const uuid = asset?.uuid ?? crypto.randomUUID()

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: asset
      ? { name: asset.name, type: asset.type, categories: asset.category, description: asset.description ?? "", url: asset.url, uuid }
      : { type: "video", categories: [], uuid },
  })

  function validateAndSubmit(values: FormValues) {
    if (!values.url) {
      toast({ title: "Upload required", description: "Please enter the asset URL", variant: "destructive" })
      return
    }
    const filename = values.url.split("/").pop()?.split(".")[0]
    if (filename !== values.uuid) {
      toast({
        title: "UUID mismatch",
        description: `URL filename (${filename}) does not match UUID (${values.uuid})`,
        variant: "destructive",
      })
      return
    }
    doSubmit(values)
  }

  async function doSubmit(values: FormValues) {
    const payload = {
      uuid: values.uuid,
      name: values.name,
      type: values.type,
      category: values.categories,
      description: values.description,
      url: values.url,
      ...(asset ? { status: "ReadyForReview" } : {}),
    }
    try {
      if (asset) await update.mutateAsync({ id: asset.id, data: payload })
      else await create.mutateAsync(payload)
      toast({ title: asset ? "Asset updated" : "Asset created" })
      reset()
      onSuccess?.()
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message, variant: "destructive" })
    }
  }

  return (
    <form onSubmit={handleSubmit(validateAndSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Name</Label>
          <Input {...register("name", { required: true })} />
        </div>
        <div>
          <Label>Type</Label>
          <Select onValueChange={v => setValue("type", v)} defaultValue={watch("type")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>UUID (auto-generated)</Label>
          <Input {...register("uuid")} readOnly className="bg-slate-50 text-xs" />
        </div>
        <div className="col-span-2">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ASSET_CATEGORIES.map(cat => (
              <label key={cat.value} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={cat.value}
                  defaultChecked={asset?.category?.includes(cat.value)}
                  onChange={e => {
                    const current = watch("categories") || []
                    if (e.target.checked) setValue("categories", [...current, cat.value])
                    else setValue("categories", current.filter((c: string) => c !== cat.value))
                  }}
                />
                {cat.label}
              </label>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <Label>Asset URL (S3)</Label>
          <Input {...register("url")} placeholder={`https://asset-manager-in-review.s3.amazonaws.com/${uuid}.mp4`} />
          <p className="text-xs text-slate-400 mt-1">
            Upload file to S3 bucket <code>asset-manager-in-review</code> with filename <code>{uuid}</code>, then paste the URL here.
          </p>
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} rows={2} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {asset ? "Update Asset" : "Create Asset"}
        </Button>
      </div>
    </form>
  )
}
