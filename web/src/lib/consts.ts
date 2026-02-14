
const APP_ENV = import.meta.env.VITE_APP_ENV || "development"

export const IS_PRODUCTION = APP_ENV === "PRODUCTION" || APP_ENV === "production" || APP_ENV === "prod" || APP_ENV === "PROD"
export const API_BASE_URL =  IS_PRODUCTION ? import.meta.env.VITE_API_URL : "http://localhost:8443/api/v1"

export const IMMUTABLE_PORTS = (import.meta.env.VITE_IMMUTABLE_PORTS || "22,25,465,587,3306,6379").split(",").map((p: string) => parseInt(p.trim(), 10))