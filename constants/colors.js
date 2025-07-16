// constants/colors.js
const coffeeTheme = {
  primary: "#8B593E",
  background: "#E4F0FE",
  text: "#4A3428",
  border: "#E5D3B7",
  white: "#FFFFFF",
  textLight: "#9A8478",
  expense: "#E74C3C",
  income: "#2ECC71",
  card: "#FFFFFF",
  shadow: "#000000",
};

const forestTheme = {
  primary: "#2E7D32",
  background: "#E8F5E9",
  text: "#1B5E20",
  border: "#C8E6C9",
  white: "#FFFFFF",
  textLight: "#66BB6A",
  expense: "#C62828",
  income: "#388E3C",
  card: "#FFFFFF",
  shadow: "#000000",
};

const purpleTheme = {
  primary: "#6A1B9A",
  background: "#F3E5F5",
  text: "#4A148C",
  border: "#D1C4E9",
  white: "#FFFFFF",
  textLight: "#BA68C8",
  expense: "#D32F2F",
  income: "#388E3C",
  card: "#FFFFFF",
  shadow: "#000000",
};

const oceanTheme = {
  primary: "#0277BD",
  background: "#E1F5FE",
  text: "#01579B",
  border: "#B3E5FC",
  white: "#FFFFFF",
  textLight: "#4FC3F7",
  expense: "#EF5350",
  income: "#26A69A",
  card: "#FFFFFF",
  shadow: "#000000",
};

export const THEMES = {
  coffee: coffeeTheme,
  forest: forestTheme,
  purple: purpleTheme,
  ocean: oceanTheme,
};

// Add app-wide light and dark theme objects for useColorScheme
export const lightTheme = {
  background: '#F8FAFC',
  card: 'white',
  text: '#1F2937',
  subtext: '#6B7280',
  border: '#E5E7EB',
  positive: '#10B981',
  negative: '#EF4444',
  accent: '#3B82F6',
  shadow: '#00000010',
  primary: '#0277BD',
  white: '#FFFFFF',
  textLight: '#6B7280',
  expense: '#EF5350',
  income: '#26A69A',
};

export const darkTheme = {
  background: '#000000',
  card: '#1A222B',
  text: '#F3F4F6',
  subtext: '#A0AEC0',
  border: '#232B36',
  positive: '#10B981',
  negative: '#EF4444',
  accent: '#3B82F6',
  shadow: '#00000040',
  primary: '#0277BD',
  white: '#FFFFFF',
  textLight: '#A0AEC0',
  expense: '#EF5350',
  income: '#26A69A',
};

// Function to get colors based on color scheme
export const getColors = (colorScheme) => {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};

// 👇 change this to switch theme - keeping for backward compatibility
export const COLORS = THEMES.ocean;
