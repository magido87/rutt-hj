import { Button } from "@/components/ui/button";
import { Sun, Moon, Cog } from "lucide-react";
import { useTheme, Theme } from "@/hooks/useTheme";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5" />;
      case "dark":
        return <Moon className="h-5 w-5" />;
      case "steampunk":
        return <Cog className="h-5 w-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Ljust";
      case "dark":
        return "Mörkt";
      case "steampunk":
        return "Steampunk";
    }
  };

  return (
    <Button
      variant="outline"
      size="default"
      onClick={toggleTheme}
      className="h-12 px-4 gap-2"
      title={`Byt tema (nuvarande: ${getLabel()})`}
    >
      {getIcon()}
      <span className="hidden md:inline">{getLabel()}</span>
    </Button>
  );
};
