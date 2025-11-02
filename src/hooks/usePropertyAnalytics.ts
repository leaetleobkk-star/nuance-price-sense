import { useQuery } from '@tanstack/react-query';
import { biSupabase } from '@/integrations/bi-supabase/client';

export interface DailyPerformanceData {
  date: string;
  occupancy: number;
  revenue: number;
  adr: number;
  rooms_sold: number;
}

export interface WeeklyPickupData {
  this_week: {
    revenue: number;
    reservations: number;
    nights: number;
    occupancy: number;
    adr: number;
  };
  last_week: {
    revenue: number;
    reservations: number;
    nights: number;
    occupancy: number;
    adr: number;
  };
}

export const useDailyPerformance = (propertyId: string | null, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['daily-performance', propertyId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!propertyId) return null;

      const { data, error } = await biSupabase.rpc('rpc_get_daily_performance', {
        p_property_id: propertyId,
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null
      });

      if (error) throw error;
      return data as DailyPerformanceData[];
    },
    enabled: !!propertyId,
  });
};

export const useWeeklyPickup = (propertyId: string | null, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['weekly-pickup', propertyId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!propertyId) return null;

      const { data, error } = await biSupabase.rpc('rpc_get_weekly_pickup', {
        p_property_id: propertyId,
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null
      });

      if (error) throw error;
      return data as WeeklyPickupData;
    },
    enabled: !!propertyId,
  });
};