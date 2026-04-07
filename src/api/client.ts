import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string
const API_KEY = import.meta.env.VITE_API_KEY as string

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "API-KEY": API_KEY,
    "Content-Type": "application/json",
  },
})

// Create a client targeting a specific prod base URL for promotion calls
export function prodClient(prodBaseUrl: string) {
  return axios.create({
    baseURL: prodBaseUrl,
    headers: {
      "API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
  })
}

apiClient.interceptors.response.use(
  res => res,
  err => {
    console.error("API error:", err.response?.data || err.message)
    return Promise.reject(err)
  }
)
