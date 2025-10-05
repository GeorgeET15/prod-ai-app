import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

type AccentColor = {
  hue: number;
  saturation: number;
  lightness: number;
};

type ThemeContextType = {
  theme: Theme;
  accentColor: AccentColor;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return (stored as Theme) || "dark";
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const stored = localStorage.getItem("accentColor");
    return stored ? JSON.parse(stored) : { hue: 280, saturation: 65, lightness: 60 };
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const { hue, saturation, lightness } = accentColor;
    
    // Update primary color
    root.style.setProperty("--primary", `${hue} ${saturation}% ${lightness}%`);
    
    // Update related colors
    root.style.setProperty("--sidebar-primary", `${hue} ${saturation}% ${lightness}%`);
    root.style.setProperty("--sidebar-ring", `${hue} ${saturation}% ${lightness}%`);
    root.style.setProperty("--ring", `${hue} ${saturation}% ${lightness}%`);
    root.style.setProperty("--chart-1", `${hue} ${saturation}% ${lightness}%`);
    
    // Update gradients with the new color
    const primaryVariant = `${hue - 20} ${saturation + 5}% ${lightness + 5}%`;
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${hue} ${saturation}% ${lightness}%), hsl(${primaryVariant}))`
    );
    
    // Update shadow glow
    root.style.setProperty(
      "--shadow-glow",
      `0 0 30px hsl(${hue} ${saturation}% ${lightness}% / 0.15)`
    );
    
    localStorage.setItem("accentColor", JSON.stringify(accentColor));
  }, [accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
