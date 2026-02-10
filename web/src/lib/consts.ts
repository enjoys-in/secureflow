

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8443/api/v1"

export const IMMUTABLE_PORTS = (import.meta.env.VITE_IMMUTABLE_PORTS || "22,25,465,587,3306,6379").split(",").map((p: string) => parseInt(p.trim(), 10))