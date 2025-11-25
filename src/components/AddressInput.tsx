import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { X, GripVertical, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const preventClearRef = useRef(false);

  // Synka localValue när parent value ändras
  useEffect(() => {
    setLocalValue(value);
    setHasValue(!!value);
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
          setHasValue(true);
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
        setIsFocused(false);
        // Ge autocomplete tid att trigga place_changed först
        setTimeout(() => {
          if (!preventClearRef.current && input.value) {
            // Användaren har skrivit något men inte valt från dropdown
            // Behåll värdet ändå
            setLocalValue(input.value);
            setHasValue(!!input.value);
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
    setHasValue(!!newValue);
    // Vänta lite innan vi uppdaterar parent (undvik spam)
    onChange(index, newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div 
      className={cn(
        "group flex gap-2 items-center p-1 rounded-xl transition-all duration-300",
        isFocused && "bg-primary/5",
        hasValue && !isFocused && "bg-muted/30"
      )}
    >
      {/* Number Badge */}
      <div 
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-300 flex-shrink-0",
          hasValue 
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
            : "bg-muted text-muted-foreground",
          isFocused && "scale-110 shadow-lg shadow-primary/30"
        )}
      >
        {index + 1}
      </div>
      
      {/* Input Container */}
      <div className="flex-1 relative">
        <div 
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-300",
            isFocused ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
        >
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Skriv adress..."
          className={cn(
            "h-11 text-base border-2 rounded-lg transition-all duration-300",
            "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
            isFocused ? "pl-10 border-primary" : "pl-4 border-transparent bg-background/50",
            hasValue && !isFocused && "border-border/50"
          )}
        />
      </div>
      
      {/* Remove Button */}
      {showRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className={cn(
            "h-9 w-9 rounded-lg flex-shrink-0 transition-all duration-300",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
            hasValue && "opacity-50"
          )}
          aria-label="Ta bort adress"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
