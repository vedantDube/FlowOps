/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Wednesday Design Tokens — Color System
      colors: {
        // Primary — Green spectrum
        primary: {
          DEFAULT: "#4ADE80",
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
          foreground: "#09090B",
        },
        // Secondary — Teal spectrum
        secondary: {
          DEFAULT: "#0D9488",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          foreground: "#FFFFFF",
        },
        // Neutrals — Zinc spectrum
        neutral: {
          50: "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          600: "#52525B",
          700: "#3F3F46",
          800: "#27272A",
          900: "#18181B",
          950: "#09090B",
        },
        // shadcn/ui CSS variable mappings
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "#4ADE80",
        warning: "#FBBF24",
        error: "#EF4444",
        info: "#3B82F6",
      },
      // Wednesday Typography
      fontFamily: {
        display: ["'Instrument Serif'", "Georgia", "serif"],
        sans: [
          "'DM Sans'",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      // Wednesday gradient presets (as bg-gradient utilities via arbitrary values)
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)",
        "gradient-primary-subtle":
          "linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(13,148,136,0.08) 100%)",
        "gradient-dark-card":
          "linear-gradient(135deg, #18181B 0%, #27272A 100%)",
        "gradient-button":
          "linear-gradient(180deg, #4ADE80 0%, #3ACC72 50%, #2AB862 100%)",
        "gradient-button-hover":
          "linear-gradient(180deg, #3BD975 0%, #2EBE68 50%, #25A85C 100%)",
        "dot-pattern": "radial-gradient(circle, #27272A 1px, transparent 1px)",
      },
      // Wednesday border radii
      borderRadius: {
        lg: "14px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        button: "14px",
        card: "24px",
      },
      // Wednesday shadows
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.8)",
        "card-dark":
          "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.1)",
        "card-hover":
          "0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(74,222,128,0.2)",
        "glow-green": "0 0 30px rgba(74,222,128,0.3)",
        "glow-sm": "0 0 16px rgba(74,222,128,0.2)",
        button: "0 4px 14px rgba(74,222,128,0.35)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "fade-in": "fade-in 0.5s cubic-bezier(0.33,1,0.68,1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.33,1,0.68,1) forwards",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { left: "-100%" },
          "50%,100%": { left: "200%" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
