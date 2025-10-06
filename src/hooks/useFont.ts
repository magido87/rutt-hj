import { useState, useEffect } from "react";

export type FontFamily = "inter" | "manrope" | "system";

export const useFont = () => {
  const [font, setFont] = useState<FontFamily>(() => {
    const saved = localStorage.getItem("font");
    return (saved as FontFamily) || "inter";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("font-inter", "font-manrope", "font-system");
    root.classList.add(`font-${font}`);
    localStorage.setItem("font", font);
  }, [font]);

  const toggleFont = () => {
    setFont((current) => {
      if (current === "inter") return "manrope";
      if (current === "manrope") return "system";
      return "inter";
    });
  };

  return { font, toggleFont, setFont };
};
