import type { MetadataRoute } from 'next';

/** Moteurs de recherche : le site vitrine oui, le CRM du personnel non. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/crm', '/login', '/api', '/uploads/documents'] },
  };
}
