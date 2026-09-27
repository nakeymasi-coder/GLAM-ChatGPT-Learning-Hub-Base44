import { base44 } from '@/api/base44Client';

export const TERMS_VERSION = '2026-09-07';
export const PRIVACY_VERSION = '2026-09-07';

export async function hasCurrentLegalAcceptance(userId) {
  const records = await base44.entities.LegalAcceptance.filter({
    created_by_id: userId,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION
  }, '-created_date', 1);
  return records.length > 0;
}