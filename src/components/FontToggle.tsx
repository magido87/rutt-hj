import { Button } from "@/components/ui/button";
import { Type } from "lucide-react";
import { useFont } from "@/hooks/useFont";

export const FontToggle = () => {
  const { font, toggleFont } = useFont();

  const getLabel = () => {
    switch (font) {
      case "inter":
        return "Inter";
      case "manrope":
        return "Manrope";
      case "system":
        return "System";
    }
  };

  return (
    <Button
      variant="outline"
      size="default"
      onClick={toggleFont}
      className="h-12 px-4 gap-2"
      title={`Byt typsnitt (nuvarande: ${getLabel()})`}
    >
      <Type className="h-5 w-5" />
      <span className="hidden md:inline">{getLabel()}</span>
    </Button>
  );
};
