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
          text: "Guide",
          items: [
            { text: "Introduction", link: "/guide/" },
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
