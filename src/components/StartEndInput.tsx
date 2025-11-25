import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface StartEndInputProps {
  value: string;
  onChange: (value: string, placeId?: string) => void;
  label: string;
  type: "start" | "end";
  apiKey: string;
  placeholder?: string;
}

export const StartEndInput = ({
  value,
  onChange,
  label,
  type,
  apiKey,
  placeholder,
}: StartEndInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [localValue, setLocalValue] = useState(value);
  const preventClearRef = useRef(false);

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

      const placeChangedListener = autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          preventClearRef.current = true;
          const newAddress = place.formatted_address;
          setLocalValue(newAddress);
          onChange(newAddress, place.place_id);
          
          setTimeout(() => {
            preventClearRef.current = false;
          }, 100);
        }
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          google.maps.event.trigger(input, 'keydown', {
            keyCode: 40,
            stopPropagation: () => {},
            preventDefault: () => {}
          });
          setTimeout(() => {
            google.maps.event.trigger(input, 'keydown', {
              keyCode: 13,
              stopPropagation: () => {},
              preventDefault: () => {}
            });
          }, 50);
        }
      };

      input.addEventListener("keydown", handleKeyDown);

      const handleBlur = () => {
        setTimeout(() => {
          if (!preventClearRef.current && input.value) {
            setLocalValue(input.value);
            onChange(input.value);
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
  }, [apiKey, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const colorClass = type === "start" ? "border-l-accent" : "border-l-destructive";
  const iconColor = type === "start" ? "text-accent" : "text-destructive";

  return (
    <div className="space-y-2">
      <Label htmlFor={`${type}-address`} className="text-base font-semibold flex items-center gap-2">
        <MapPin className={`h-4 w-4 ${iconColor}`} />
        {label}
      </Label>
      <Input
        ref={inputRef}
        id={`${type}-address`}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder || "Skriv adress..."}
        className={`h-12 text-base border-2 border-l-4 ${colorClass} focus-visible:ring-2`}
      />
    </div>
  );
};
