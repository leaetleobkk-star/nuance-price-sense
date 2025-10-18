import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Property {
  id: string;
  name: string;
  booking_url: string | null;
}

interface Competitor {
  id: string;
  name: string;
  booking_url: string;
}

interface PropertyContextType {
  properties: Property[];
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  competitors: Competitor[];
  isLoading: boolean;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchCompetitors(selectedProperty.id);
    } else {
      setCompetitors([]);
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (!error && data) {
      setProperties(data);
      if (data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0]);
      }
    }
    setIsLoading(false);
  };

  const fetchCompetitors = async (propertyId: string) => {
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("property_id", propertyId)
      .order("name");

    if (!error && data) {
      setCompetitors(data);
    }
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        selectedProperty,
        setSelectedProperty,
        competitors,
        isLoading,
        refreshProperties: fetchProperties,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error("useProperty must be used within PropertyProvider");
  }
  return context;
};
