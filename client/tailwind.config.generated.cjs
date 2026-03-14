/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
      "blue": {
            "50": "#EAF2FF",
            "100": "#D6E5FF",
            "200": "#ADC9FF",
            "300": "#85ADFF",
            "400": "#5C91FF",
            "500": "#3375FF",
            "600": "#1F6FEB",
            "700": "#1959BD",
            "800": "#13438F",
            "900": "#0C2D61"
      },
      "teal": {
            "50": "#E8FBF8",
            "100": "#D1F6F1",
            "200": "#A3EDE3",
            "300": "#74E4D5",
            "400": "#46DBC7",
            "500": "#2EC4B6",
            "600": "#25A295",
            "700": "#1C8074",
            "800": "#145E53",
            "900": "#0B3C32"
      },
      "amber": {
            "50": "#FFF8E8",
            "100": "#FFF1D1",
            "200": "#FFE3A3",
            "300": "#FFD575",
            "400": "#F9C34F",
            "500": "#F4B942",
            "600": "#D4961E",
            "700": "#A77518",
            "800": "#7A5411",
            "900": "#4D340A"
      },
      "navy": {
            "50": "#E9EDF1",
            "100": "#D3DBE3",
            "200": "#A7B7C8",
            "300": "#7B94AC",
            "400": "#4F7091",
            "500": "#2E4C70",
            "600": "#1E3552",
            "700": "#162A41",
            "800": "#0E1B2A",
            "900": "#08111A"
      },
      "neutral": {
            "50": "#F8FAFC",
            "100": "#F1F5F9",
            "200": "#E2E8F0",
            "300": "#CBD5E1",
            "400": "#94A3B8",
            "500": "#64748B",
            "600": "#475569",
            "700": "#334155",
            "800": "#1E293B",
            "900": "#0F172A"
      },
      "semantic": {
            "success": "#22C55E",
            "warning": "#F59E0B",
            "error": "#EF4444",
            "info": "#0EA5E9",
            "focusRing": "#1F6FEB"
      }
},
      spacing: {
      "2": "2px",
      "4": "4px",
      "8": "8px",
      "12": "12px",
      "16": "16px",
      "24": "24px",
      "32": "32px",
      "48": "48px",
      "64": "64px"
},
      borderRadius: {
      "none": "0",
      "sm": "4px",
      "md": "8px",
      "lg": "12px",
      "xl": "16px",
      "2xl": "24px",
      "pill": "999px"
},
      boxShadow: {
      "xs": "0 1px 2px rgba(2,6,23,0.08)",
      "sm": "0 2px 8px rgba(2,6,23,0.10)",
      "md": "0 6px 16px rgba(2,6,23,0.12)",
      "lg": "0 12px 28px rgba(2,6,23,0.16)",
      "xl": "0 20px 40px rgba(2,6,23,0.20)"
},
      fontFamily: {
      "sans": [
            "IBM Plex Sans Arabic",
            "system-ui",
            "sans-serif"
      ],
      "secondary": [
            "IBM Plex Sans",
            "Inter",
            "system-ui",
            "sans-serif"
      ]
},
      fontSize: {
      "xs": [
            "12px",
            {
                  "lineHeight": "18px"
            }
      ],
      "sm": [
            "14px",
            {
                  "lineHeight": "20px"
            }
      ],
      "md": [
            "16px",
            {
                  "lineHeight": "24px"
            }
      ],
      "lg": [
            "18px",
            {
                  "lineHeight": "28px"
            }
      ],
      "xl": [
            "20px",
            {
                  "lineHeight": "30px"
            }
      ],
      "2xl": [
            "24px",
            {
                  "lineHeight": "34px"
            }
      ],
      "3xl": [
            "30px",
            {
                  "lineHeight": "40px"
            }
      ],
      "4xl": [
            "36px",
            {
                  "lineHeight": "46px"
            }
      ],
      "4xlDisplay": [
            "44px",
            {
                  "lineHeight": "54px"
            }
      ]
}
    }
  },
  plugins: []
};
