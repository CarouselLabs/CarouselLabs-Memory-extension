// Generate per-theme CSS from @carousellabs/design-tokens dist
// Usage: node scripts/generate-themes.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Adjust this path if your enterprise packages live elsewhere
const DT_DIST = '/Users/davideagle/git/CarouselLabs/enterprise-packages/packages/design-tokens/dist/static.js';

function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function toCss(theme){
  const t = theme || {};
  const c = t.colors || {};
  const sh = t.shadows || {};
  const tr = (t.transitions || t.animation || {});
  const durations = {
    fast: (tr.fast || tr.duration || '150ms'),
    normal: (tr.normal || '300ms'),
    slow: (tr.slow || '500ms')
  };
  const easing = (t.easing || { easeOut: 'cubic-bezier(0,0,0.2,1)', easeInOut: 'cubic-bezier(0.4,0,0.2,1)' });
  const base = `:root{\n`
    + `  --color-primary: ${c.primary || '#4DB9A5'};\n`
    + `  --color-secondary: ${c.secondary || c.accent || '#22D3EE'};\n`
    + `  --color-accent: ${c.accent || c.secondary || '#22C55E'};\n`
    + `  --color-background: ${c.background || '#131416'};\n`
    + `  --color-surface: ${c.surface || '#1E293B'};\n`
    + `  --color-text-primary: ${c.text || '#E1E1E3'};\n`
    + `  --color-text-secondary: ${c.textSecondary || '#CBD5E1'};\n`
    + `  --color-text-muted: ${c.textTertiary || '#94A3B8'};\n`
    + `  --color-border: ${c.border || '#334155'};\n`
    + `  --color-success: ${c.success || '#22C55E'};\n`
    + `  --color-warning: ${c.warning || '#F59E0B'};\n`
    + `  --color-error: ${c.error || '#EF4444'};\n`
    + `  --color-info: ${c.info || '#3B82F6'};\n`
    + `  --shadow-sm: ${sh.sm || '0 1px 2px rgba(0,0,0,0.1)'};\n`
    + `  --shadow-md: ${sh.md || '0 4px 6px rgba(0,0,0,0.1)'};\n`
    + `  --shadow-lg: ${sh.lg || '0 10px 15px rgba(0,0,0,0.1)'};\n`
    + `  --shadow-xl: ${sh.xl || '0 20px 25px rgba(0,0,0,0.1)'};\n`
    + `  --duration-fast: ${durations.fast};\n`
    + `  --duration-normal: ${durations.normal};\n`
    + `  --duration-slow: ${durations.slow};\n`
    + `  --easing-default: ${easing.easeOut || 'cubic-bezier(0,0,0.2,1)'};\n`
    + `  --easing-smooth: ${easing.easeInOut || 'cubic-bezier(0.4,0,0.2,1)'};\n`
    + `  --easing-bounce: cubic-bezier(0.68,-0.55,0.265,1.55);\n`
    + `  --bg-dark: ${c.background || '#131416'};\n`
    + `  --bg-card: ${c.surface || '#1E293B'};\n`
    + `  --bg-button: ${c.surface || '#1E293B'};\n`
    + `  --bg-button-hover: ${c.textTertiary || '#94A3B8'};\n`
    + `  --text-white: ${c.text || '#E1E1E3'};\n`
    + `  --text-gray: ${c.textTertiary || '#94A3B8'};\n`
    + `  --purple: ${c.primary || '#4DB9A5'};\n`
    + `  --border-color: ${c.border || '#334155'};\n`
    + `  --tag-bg: ${c.surface || '#1E293B'};\n`
    + `  --scrollbar-bg: ${c.background || '#131416'};\n`
    + `  --scrollbar-thumb: ${c.surface || '#1E293B'};\n`
    + `  --success-color: ${c.success || '#22C55E'};\n`
    + `}`;
  return base + "\n";
}

async function main(){
  const outDir = path.join(__dirname, '..', 'themes', 'generated');
  ensureDir(outDir);
  const mod = await import(url.pathToFileURL(DT_DIST).href);
  const names = (mod.getThemeNames ? mod.getThemeNames() : Object.keys(mod.themes || {}));
  for (const name of names){
    const theme = mod.getTheme ? mod.getTheme(name) : (mod.themes ? mod.themes[name] : {});
    const css = toCss(theme);
    const file = path.join(outDir, `${name}.css`);
    fs.writeFileSync(file, css);
    console.log('Wrote', file);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });




