const configuredUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "";
const configuredKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

export const MEDUSA_URL = /^https?:\/\//.test(configuredUrl)
  ? configuredUrl.replace(/\/$/, "")
  : "https://km-beauty-wellness-production.up.railway.app";

// Medusa publishable keys are public browser credentials, not admin secrets.
export const MEDUSA_PUBLISHABLE_KEY = configuredKey.startsWith("pk_")
  ? configuredKey
  : "pk_e71609f74b528a9bf5d970bad8bd17f5d3359d6a45ffa4d3c3532f2f6dbe3ee4";
