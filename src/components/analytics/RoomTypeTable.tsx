import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { biSupabase } from "@/integrations/bi-supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const RoomTypeTable = () => {
  const { data: roomTypes, isLoading } = useQuery({
    queryKey: ['bi-room-types'],
    queryFn: async () => {
      const currentDate = new Date();
      const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      const { data, error } = await biSupabase
        .from('lh_room_types')
        .select('*')
        .eq('property_id', 'property_1')
        .eq('period', period)
        .order('revenue', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 80) return "text-green-600 dark:text-green-400";
    if (occupancy >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Room Type Performance</h3>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Type</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Reservations</TableHead>
                <TableHead className="text-right">Nights</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">ADR</TableHead>
                <TableHead className="text-right">RevPAR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomTypes?.map((room, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{room.room_type || 'Unknown'}</TableCell>
                  <TableCell className="text-right">${room.revenue?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-right">{room.reservations || 0}</TableCell>
                  <TableCell className="text-right">{room.nights || 0}</TableCell>
                  <TableCell className={`text-right font-medium ${getOccupancyColor(room.occupancy || 0)}`}>
                    {room.occupancy?.toFixed(1) || 0}%
                  </TableCell>
                  <TableCell className="text-right">${room.adr?.toFixed(2) || 0}</TableCell>
                  <TableCell className="text-right">${room.revpar?.toFixed(2) || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {(!roomTypes || roomTypes.length === 0) && (
          <p className="text-center text-muted-foreground py-8">
            No room type data available for the current period
          </p>
        )}
      </div>
    </Card>
  );
};