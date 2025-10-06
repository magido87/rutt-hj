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
  const preventClearRef = useRef(false);

  // Synka localValue när parent value ändras
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (!inputRef.current || !apiKey || !(window as any).google) return;

    try {
      const google = (window as any).google;
      const input = inputRef.current;
      
      autocompleteRef.current = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "se" },
        fields: ["formatted_address", "place_id", "geometry"],
      });

      // Lyssna på place_changed (när användaren väljer från dropdown)
      const placeChangedListener = autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          preventClearRef.current = true;
          const newAddress = place.formatted_address;
          setLocalValue(newAddress);
          onChange(index, newAddress, place.place_id);
          
          // Återställ flag efter en kort delay
          setTimeout(() => {
            preventClearRef.current = false;
          }, 100);
        }
      });

      // Förhindra att Google Autocomplete rensar fältet vid blur
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          // Välj första förslaget vid Enter
          google.maps.event.trigger(input, 'keydown', {
            keyCode: 40, // Down arrow
            stopPropagation: () => {},
            preventDefault: () => {}
          });
          setTimeout(() => {
            google.maps.event.trigger(input, 'keydown', {
              keyCode: 13, // Enter
              stopPropagation: () => {},
              preventDefault: () => {}
            });
          }, 50);
        }
      };

      input.addEventListener("keydown", handleKeyDown);

      // Hantera blur - förhindra clearing om användaren valt något
      const handleBlur = () => {
        // Ge autocomplete tid att trigga place_changed först
        setTimeout(() => {
          if (!preventClearRef.current && input.value) {
            // Användaren har skrivit något men inte valt från dropdown
            // Behåll värdet ändå
            setLocalValue(input.value);
            onChange(index, input.value);
          }
        }, 200);
      };

      input.addEventListener("blur", handleBlur);

      return () => {
        if (placeChangedListener) {
          google.maps.event.removeListener(placeChangedListener);
        }
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        input.removeEventListener("keydown", handleKeyDown);
        input.removeEventListener("blur", handleBlur);
      };
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }
  }, [apiKey, index, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    // Vänta lite innan vi uppdaterar parent (undvik spam)
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

