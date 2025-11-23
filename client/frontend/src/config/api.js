// API configuration for different environments
const API_BASE_URL = import.meta.env.PROD 
  ? '' // Use relative URLs in production (Vercel)
  : 'http://localhost:5000' // Local development

export { API_BASE_URL }