import { useQuery } from '@tanstack/react-query';
import { biSupabase } from '@/integrations/bi-supabase/client';

interface DashboardData {
  summary: {
    kpis: {
      revenue: number;
      occupancy: number;
      adr: number;
      revpar: number;
      reservations: number;
      nights: number;
      stly_change?: number;
      ly_change?: number;
      budget_change?: number;
    };
  };
  monthly_trend: {
    trend_data: Array<{
      period: string;
      revenue: number;
      occupancy: number;
      adr: number;
      nights: number;
    }>;
  };
  room_types: {
    room_types: Array<{
      room_type: string;
      revenue: number;
      reservations: number;
      nights: number;
      occupancy: number;
      adr: number;
      revpar: number;
    }>;
  };
  channels: {
    channels: Array<{
      channel: string;
      revenue: number;
      reservations: number;
    }>;
  };
}

export const useCompleteAnalytics = (
  propertyId: string | null, 
  period: string | null = null,
  startDate?: Date,
  endDate?: Date
) => {
  return useQuery({
    queryKey: ['complete-analytics', propertyId, period, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!propertyId) return null;

      const { data, error } = await biSupabase.rpc('rpc_get_complete_dashboard', {
        p_property_id: propertyId,
        p_period: period,
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null
      });

      if (error) throw error;
      return data as DashboardData;
    },
    enabled: !!propertyId,
  });
};
