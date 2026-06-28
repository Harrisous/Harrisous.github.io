module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}", "./mascot/**/*.{js,css}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: "#020202",
          dark: "#050508",
          darker: "#0a0a12",
          panel: "#0c0c18",
          line: "rgba(0,195,217,0.18)",
          neonBlue: "#00e5ff",
          neonCyan: "#00c3d9",
          neonPink: "#ff00c8",
          neonMag: "#d900d9",
          neonYellow: "#f5e663",
          neonLime: "#a7ff4c",
          dim: "rgba(0, 195, 217, 0.05)",
          dimPink: "rgba(255, 0, 200, 0.08)",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier New"', "Courier", "monospace"],
        display: ['"Share Tech Mono"', '"Courier New"', "monospace"],
      },
    },
  },
  safelist: [
    "active",
    "k-projects",
    "k-blogs",
    "k-resources",
    "slot-next",
    "slot-prev",
    "focus",
    "dim",
    "dim-2",
    "disabled",
    "open",
    "is-hit",
    "avatar-playing",
    "rail-breath",
  ],
};
