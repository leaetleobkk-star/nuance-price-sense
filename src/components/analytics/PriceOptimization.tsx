import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomType {
  id: string;
  name: string;
  isExpanded: boolean;
}

export function PriceOptimization() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([
    { id: "dorm-large", name: "Dorm - Large (10-20 Bed)", isExpanded: false },
    { id: "dorm-medium", name: "Dorm - Medium (6 Bed)", isExpanded: false },
    { id: "dorm-small", name: "Dorm - Small (2-4 Bed)", isExpanded: false },
    { id: "privates", name: "Privates", isExpanded: false },
    { id: "staff-rooms", name: "Staff Rooms (Non-Yieldable)", isExpanded: false },
    { id: "non-sellable", name: "Non-Sellable / Non-Rooms", isExpanded: false },
  ]);

  // Generate sample dates for the grid (30 days)
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" }),
        fullDate: date,
      });
    }
    return dates;
  };

  const dates = generateDates();

  const toggleRoomType = (id: string) => {
    setRoomTypes(roomTypes.map(rt => 
      rt.id === id ? { ...rt, isExpanded: !rt.isExpanded } : rt
    ));
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <Tabs defaultValue="pricing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="pickup">Pick-up</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-4">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Header Row */}
                <div className="flex border-b">
                  <div className="w-64 flex-shrink-0 p-3 bg-muted font-medium">
                    Room Type
                  </div>
                  {dates.map((d, idx) => (
                    <div key={idx} className="w-24 flex-shrink-0 text-center border-l">
                      <div className="text-xs text-muted-foreground py-1">{d.day}</div>
                      <div className="text-xs font-medium pb-1">{d.date}</div>
                    </div>
                  ))}
                </div>

                {/* Room Type Rows */}
                {roomTypes.map((roomType) => (
                  <div key={roomType.id} className="border-b">
                    <div className="flex items-stretch hover:bg-muted/50 transition-colors">
                      <div className="w-64 flex-shrink-0 p-3 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => toggleRoomType(roomType.id)}
                        >
                          {roomType.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <span className="text-sm">{roomType.name}</span>
                      </div>
                      {dates.map((d, idx) => (
                        <div
                          key={idx}
                          className="w-24 flex-shrink-0 border-l p-2 flex flex-col items-center justify-center min-h-[60px]"
                        >
                          <div className="text-xs text-muted-foreground mb-1">--</div>
                          <div className="text-sm font-medium">--</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-800 rounded"></div>
                <span>High Occupancy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-teal-600 rounded"></div>
                <span>Good Occupancy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-sky-400 rounded"></div>
                <span>Medium Occupancy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-background border rounded"></div>
                <span>Low Occupancy</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-4">
            <p className="text-muted-foreground text-center py-12">
              Restrictions data will be available soon
            </p>
          </TabsContent>

          <TabsContent value="occupancy" className="space-y-4">
            <p className="text-muted-foreground text-center py-12">
              Occupancy data will be available soon
            </p>
          </TabsContent>

          <TabsContent value="pickup" className="space-y-4">
            <p className="text-muted-foreground text-center py-12">
              Pick-up analysis will be available soon
            </p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
