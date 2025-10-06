import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "steampunk";

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("app_theme");
    return (saved as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Ta bort alla tema-klasser
    root.classList.remove("light", "dark", "steampunk");
    
    // Lägg till aktuellt tema
    root.classList.add(theme);
    
    // Spara i localStorage
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => {
      if (current === "light") return "dark";
      if (current === "dark") return "steampunk";
      return "light";
    });
  };

  return { theme, setTheme, toggleTheme };
};
