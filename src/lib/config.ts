// Production domain configuration
// Update this to your VPS/production domain
export const PRODUCTION_DOMAIN = "https://inovafinance.online";

// Get the base URL for affiliate links
export const getAffiliateBaseUrl = (): string => {
  // In production or when configured, use the production domain
  // Otherwise fallback to current origin for local development
  if (import.meta.env.PROD || PRODUCTION_DOMAIN) {
    return PRODUCTION_DOMAIN;
  }
  return window.location.origin;
};
