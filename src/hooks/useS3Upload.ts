import { useState, useRef } from "react"
import { apiClient } from "../api/client"

interface PresignedResponse {
  presigned_url: string
  s3_url: string
}

export function useS3Upload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  async function uploadToS3(file: File, uuid: string): Promise<string | null> {
    setUploading(true)
    setProgress(0)
    setError(null)

    // Retry logic with exponential backoff
    let lastError: Error | null = null
    const maxRetries = 2
    const baseDelay = 1000 // 1 second

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Step 1: Get presigned URL from backend
        const presignedResponse = await apiClient.post<PresignedResponse>(
          "/api/v1/internal/media_assets/presigned_upload_url/",
          {
            uuid,
            filename: file.name,
            content_type: file.type || "application/octet-stream",
          }
        )

        const { presigned_url, s3_url } = presignedResponse.data

        // Step 2: Upload file to S3 using presigned URL
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        // Set timeout: 5 minutes for large files, scales with file size
        const fileSizeMB = file.size / (1024 * 1024)
        const estimatedSeconds = Math.max(300, fileSizeMB * 2) // ~2 seconds per MB, min 5 min
        xhr.timeout = estimatedSeconds * 1000

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100)
            setProgress(percentComplete)
          }
        })

        // Handle completion
        const result = await new Promise<string>((resolve, reject) => {
          xhr.addEventListener("load", () => {
            if (xhr.status === 200 || xhr.status === 201) {
              console.log("Upload completed successfully")
              resolve(s3_url)
            } else {
              reject(
                new Error(
                  `Upload failed with status ${xhr.status}: ${xhr.statusText || "Unknown error"}`
                )
              )
            }
          })

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed: Network error or CORS issue"))
          })

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload was cancelled"))
          })

          xhr.addEventListener("timeout", () => {
            reject(
              new Error(
                `Upload timed out after ${Math.round(xhr.timeout / 1000)}s. File may be too large for your connection.`
              )
            )
          })

          console.log(
            `Starting upload (attempt ${attempt + 1}/${maxRetries + 1}): ${file.name} (${(
              file.size /
              (1024 * 1024)
            ).toFixed(2)}MB)`
          )

          xhr.open("PUT", presigned_url)
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
          xhr.send(file)
        })

        setProgress(100)
        setUploading(false)
        xhrRef.current = null

        return result
      } catch (err: any) {
        lastError = err
        const errorMsg =
          err.response?.data?.error || err.message || "Upload failed"

        console.error(`Upload attempt ${attempt + 1} failed:`, errorMsg)

        // Don't retry on client-side errors
        if (errorMsg.includes("UUID mismatch") || errorMsg.includes("CORS")) {
          setError(errorMsg)
          setUploading(false)
          return null
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          const delayMs = baseDelay * Math.pow(2, attempt)
          console.log(`Retrying in ${delayMs}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    // All retries failed
    const finalError = lastError?.message || "Upload failed after multiple attempts"
    setError(finalError)
    setUploading(false)
    xhrRef.current = null

    return null
  }

  // Cancel upload if needed
  function cancelUpload() {
    if (xhrRef.current) {
      xhrRef.current.abort()
      xhrRef.current = null
      setUploading(false)
      setProgress(0)
      setError("Upload cancelled")
    }
  }

  return { uploadToS3, uploading, progress, error, cancelUpload }
}
