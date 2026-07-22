import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/starfish/",
  title: "Starfish",
  description:
    "Transport-neutral realtime protocol for creative coding",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Cookbook", link: "/cookbook/" },
      { text: "Scenarios", link: "/scenarios/" },
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
        {
          text: "Getting Connected",
          items: [
            { text: "Automatic Reconnection", link: "/cookbook/auto-reconnect" },
            { text: "Connection State Changes", link: "/cookbook/connection-state" },
          ],
        },
        {
          text: "Sessions & Presence",
          items: [
            { text: "Track Who's Online", link: "/cookbook/presence" },
          ],
        },
        {
          text: "Messaging",
          items: [
            { text: "Publish/Subscribe", link: "/cookbook/pub-sub" },
            { text: "Reliable vs Unreliable", link: "/cookbook/reliable-vs-unreliable" },
            { text: "Targeted Messaging", link: "/cookbook/targeted-messaging" },
            { text: "Request/Reply Pattern", link: "/cookbook/request-reply" },
          ],
        },
        {
          text: "Matchmaking",
          items: [
            { text: "Auto Pairing", link: "/cookbook/pool-auto-pairing" },
            { text: "Attribute Filtering", link: "/cookbook/pool-filtered-matching" },
            { text: "Delegated Matchmaker", link: "/cookbook/pool-delegated-matchmaker" },
            { text: "Re-pairing on Disconnect", link: "/cookbook/pool-repaired-on-disconnect" },
          ],
        },
        {
          text: "Data & State",
          items: [
            { text: "Shared State", link: "/cookbook/shared-state" },
          ],
        },
        {
          text: "Advanced",
          items: [
            { text: "Event Filtering", link: "/cookbook/event-filtering" },
            { text: "WebRTC Data Channels", link: "/cookbook/webrtc-data-channels" },
          ],
        },
      ],
      "/scenarios/": [
        {
          text: "Scenarios",
          items: [
            { text: "Overview", link: "/scenarios/" },
            { text: "Constellation", link: "/scenarios/constellation" },
            { text: "Duet", link: "/scenarios/duet" },
            { text: "The Long Mural", link: "/scenarios/the-long-mural" },
            { text: "Chorus", link: "/scenarios/chorus" },
            { text: "Wander", link: "/scenarios/wander" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Overview", link: "/reference/" },
            { text: "Pool Matchmaking API", link: "/reference/pool" },
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
