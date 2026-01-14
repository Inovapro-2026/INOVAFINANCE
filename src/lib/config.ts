// Production domain configuration
// Using the Lovable preview domain for affiliate links
export const PRODUCTION_DOMAIN = "https://40fcad02-1f4c-44c7-b7e6-1c89eb4ee1ae.lovableproject.com";

// Get the base URL for affiliate links
export const getAffiliateBaseUrl = (): string => {
  return PRODUCTION_DOMAIN;
};
