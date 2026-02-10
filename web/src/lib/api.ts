import axios from "axios"
import { API_BASE_URL } from "./consts"


const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    timeout: 15000,
})

// ---- Response interceptor: handle 401 ----
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (window.location.pathname !== "/login") {
                window.location.href = "/login"
            }
        }
        return Promise.reject(error)
    }
)

export default api
