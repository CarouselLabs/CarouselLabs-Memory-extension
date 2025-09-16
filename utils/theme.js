// Theme tokens for MemLoop (derived from CarouselLabs Frontend theme-system)
// Exposes CSS variables and maps to extension-specific variables used in sidebar styles

export const themes = {
  dark: {
    name: "dark",
    colors: {
      primary: "#4DB9A5",
      secondary: "#17D8FD",
      accent: "#2F8F5A",
      background: "#131416",
      surface: "#1E293B",
      text: { primary: "#E1E1E3", secondary: "#CBD5E1", muted: "#94A3B8" },
      border: "#334155",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
    shadows: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    },
    animations: {
      duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
      easing: { default: "cubic-bezier(0.4, 0, 0.2, 1)", smooth: "cubic-bezier(0.4, 0, 0.6, 1)", bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
    },
  },
  light: {
    name: "light",
    colors: {
      primary: "#22C55E",
      secondary: "#0891B2",
      accent: "#2F8F5A",
      background: "#FEFEFE",
      surface: "#F8F9FA",
      text: { primary: "#1E293B", secondary: "#475569", muted: "#64748B" },
      border: "#E2E8F0",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
    shadows: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    },
    animations: {
      duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
      easing: { default: "cubic-bezier(0.4, 0, 0.2, 1)", smooth: "cubic-bezier(0.4, 0, 0.6, 1)", bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
    },
  },
  midway: {
    name: "midway",
    colors: {
      primary: "#4DB9A5",
      secondary: "#22D3EE",
      accent: "#22C55E",
      background: "#172033",
      surface: "#334155",
      text: { primary: "#CBD5E1", secondary: "#94A3B8", muted: "#64748B" },
      border: "#475569",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
    shadows: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(255, 255, 255, 0.1)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(255, 255, 255, 0.1)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(255, 255, 255, 0.1)",
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(255, 255, 255, 0.1)",
    },
    animations: {
      duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
      easing: { default: "cubic-bezier(0.4, 0, 0.2, 1)", smooth: "cubic-bezier(0.4, 0, 0.6, 1)", bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
    },
  },
  "refined-midway": {
    name: "refined-midway",
    colors: {
      primary: "#34D399",
      secondary: "#22D3EE",
      accent: "#22C55E",
      background: "#0F1419",
      surface: "#1A2332",
      text: { primary: "#F1F5F9", secondary: "#CBD5E1", muted: "#94A3B8" },
      border: "#475569",
      success: "#22C55E",
      warning: "#FBBF24",
      error: "#EF4444",
      info: "#3B82F6",
    },
    shadows: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 1px 3px 0 rgba(52, 211, 153, 0.1)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(52, 211, 153, 0.1)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(52, 211, 153, 0.1)",
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 10px 10px -5px rgba(52, 211, 153, 0.1)",
    },
    animations: {
      duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
      easing: { default: "cubic-bezier(0.4, 0, 0.2, 1)", smooth: "cubic-bezier(0.4, 0, 0.6, 1)", bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
    },
  },
}

export function generateCSSVariables(theme) {
  const t = theme;
  const baseVars = `
    --color-primary: ${t.colors.primary};
    --color-secondary: ${t.colors.secondary};
    --color-accent: ${t.colors.accent};
    --color-background: ${t.colors.background};
    --color-surface: ${t.colors.surface};
    --color-text-primary: ${t.colors.text.primary};
    --color-text-secondary: ${t.colors.text.secondary};
    --color-text-muted: ${t.colors.text.muted};
    --color-border: ${t.colors.border};
    --color-success: ${t.colors.success};
    --color-warning: ${t.colors.warning};
    --color-error: ${t.colors.error};
    --color-info: ${t.colors.info};
    --shadow-sm: ${t.shadows.sm};
    --shadow-md: ${t.shadows.md};
    --shadow-lg: ${t.shadows.lg};
    --shadow-xl: ${t.shadows.xl};
    --duration-fast: ${t.animations.duration.fast};
    --duration-normal: ${t.animations.duration.normal};
    --duration-slow: ${t.animations.duration.slow};
    --easing-default: ${t.animations.easing.default};
    --easing-smooth: ${t.animations.easing.smooth};
    --easing-bounce: ${t.animations.easing.bounce};
  `;
  // Map to existing sidebar vars
  const mapVars = `
    --bg-dark: ${t.colors.background};
    --bg-card: ${t.colors.surface};
    --bg-button: ${t.colors.surface};
    --bg-button-hover: ${t.colors.text.muted};
    --text-white: ${t.colors.text.primary};
    --text-gray: ${t.colors.text.muted};
    --purple: ${t.colors.primary};
    --border-color: ${t.colors.border};
    --tag-bg: ${t.colors.surface};
    --scrollbar-bg: ${t.colors.background};
    --scrollbar-thumb: ${t.colors.surface};
    --success-color: ${t.colors.success};
  `;
  return baseVars + mapVars;
}

export async function applyTheme(themeName) {
  const styleId = "memloop-theme-vars";
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.documentElement.appendChild(style);
  }
  // Try enterprise-generated CSS first
  try {
    const url = chrome.runtime.getURL(`themes/generated/${themeName}.css`);
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const cssText = await res.text();
      style.textContent = cssText;
      return;
    }
  } catch {}
  // Fallback to local theme map
  const theme = themes[themeName] || themes.dark;
  const css = generateCSSVariables(theme);
  style.textContent = `:root{${css}}`;
}

function getFromSync(keys) {
  return new Promise((resolve)=>{ try { chrome.storage.sync.get(keys, (d)=>resolve(d||{})) } catch { resolve({}) } });
}

export async function applyThemeFromSettings() {
  const d = await getFromSync(["theme_name"]);
  const name = d.theme_name || "dark";
  await applyTheme(name);
}

export function getThemeNames() {
  return Object.keys(themes);
}


