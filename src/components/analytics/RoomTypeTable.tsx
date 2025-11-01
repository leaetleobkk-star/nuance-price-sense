import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RoomTypeTableProps {
  data?: {
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
}

export const RoomTypeTable = ({ data }: RoomTypeTableProps) => {
  if (!data || !data.room_types || data.room_types.length === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Room Type Performance</h3>
          <p className="text-center text-muted-foreground py-8">
            No room type data available. Please refresh data from Little Hotelier.
          </p>
        </div>
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
              {data.room_types?.map((room, index) => (
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
        
        {(!data.room_types || data.room_types.length === 0) && (
          <p className="text-center text-muted-foreground py-8">
            No room type data available for the current period
          </p>
        )}
      </div>
    </Card>
  );
};