import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddressInputProps {
  index: number;
  value: string;
  onChange: (index: number, value: string, placeId?: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
  apiKey: string;
}

export const AddressInput = ({
  index,
  value,
  onChange,
  onRemove,
  showRemove,
  apiKey,
}: AddressInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (!inputRef.current || !apiKey || !(window as any).google) return;

    try {
      const google = (window as any).google;
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: "se" },
          fields: ["formatted_address", "place_id", "geometry"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          setLocalValue(place.formatted_address);
          onChange(index, place.formatted_address, place.place_id);
        }
      });
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }

    return () => {
      if (autocompleteRef.current && (window as any).google) {
        (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [apiKey, index, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(index, newValue);
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-primary text-lg">
          {index + 1}.
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder="Skriv adress..."
          className="pl-12 h-12 text-base border-2 focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      {showRemove && (
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-12 w-12"
          aria-label="Ta bort adress"
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

