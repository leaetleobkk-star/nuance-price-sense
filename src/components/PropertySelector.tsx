import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PropertySelector = () => {
  const { properties, selectedProperty, setSelectedProperty, isLoading } = useProperty();

  const handlePrevious = () => {
    if (!selectedProperty || properties.length === 0) return;
    const currentIndex = properties.findIndex(p => p.id === selectedProperty.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : properties.length - 1;
    setSelectedProperty(properties[previousIndex]);
  };

  const handleNext = () => {
    if (!selectedProperty || properties.length === 0) return;
    const currentIndex = properties.findIndex(p => p.id === selectedProperty.id);
    const nextIndex = currentIndex < properties.length - 1 ? currentIndex + 1 : 0;
    setSelectedProperty(properties[nextIndex]);
  };

  if (isLoading || !selectedProperty) {
    return (
      <div className="border-b bg-card px-6 py-3">
        <div className="text-sm text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="border-b bg-card px-6 py-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Select
          value={selectedProperty.id}
          onValueChange={(value) => {
            const property = properties.find(p => p.id === value);
            if (property) setSelectedProperty(property);
          }}
        >
          <SelectTrigger className="w-[300px] border-0 shadow-none">
            <SelectValue>
              <span className="font-medium">{selectedProperty.name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
