import apiClient from '@/lib/api-client';

/** Coordonnées de l'agence reprises dans les messages de confirmation de visite. */
export interface AgencySettings {
  name: string;
  address: string;
  mapsUrl: string;
  phone: string;
  visitFee: number;
}

export const AGENCY_SETTINGS_KEY = ['settings', 'agency'] as const;

export const settingsService = {
  getAgency: async (): Promise<AgencySettings> => {
    const { data } = await apiClient.get('/settings/agency');
    return data;
  },
  updateAgency: async (dto: Partial<AgencySettings>): Promise<AgencySettings> => {
    const { data } = await apiClient.put('/settings/agency', dto);
    return data;
  },
};
