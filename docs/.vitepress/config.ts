import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Starfish",
  description:
    "Transport-neutral realtime protocol for creative coding",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Cookbook", link: "/cookbook/" },
      { text: "Reference", link: "/reference/" },
      { text: "Adapters", link: "/adapters/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Quick Start", link: "/guide/quick-start" },
          ],
        },
        {
          text: "Essentials",
          items: [
            { text: "Core Concepts", link: "/guide/core-concepts" },
            { text: "Configuration", link: "/guide/configuration" },
            { text: "API Overview", link: "/guide/api-overview" },
          ],
        },
        {
          text: "In Depth",
          items: [
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Common Workflows", link: "/guide/workflows" },
            { text: "Best Practices", link: "/guide/best-practices" },
            { text: "Troubleshooting", link: "/guide/troubleshooting" },
          ],
        },
      ],
      "/cookbook/": [
        {
          text: "Cookbook",
          items: [
            { text: "Overview", link: "/cookbook/" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Overview", link: "/reference/" },
          ],
        },
      ],
      "/adapters/": [
        {
          text: "Adapters",
          items: [
            { text: "Overview", link: "/adapters/" },
          ],
        },
      ],
    },

    search: {
      provider: "local",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/driangle/starfish" },
    ],
  },
});
