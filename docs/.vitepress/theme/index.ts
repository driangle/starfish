import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import Home from "./Home.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Used by the home page (docs/index.md, layout: page)
    app.component("Home", Home);
  },
} satisfies Theme;
