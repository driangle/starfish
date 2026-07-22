<script setup lang="ts">
import DefaultTheme from "vitepress/theme";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <!-- Diamond + dot logo mark before the wordmark -->
    <template #nav-bar-title-before>
      <span class="sf-logo" aria-hidden="true">
        <span class="sf-logo-diamond"></span>
        <span class="sf-logo-dot"></span>
      </span>
    </template>

    <!-- Version badge after the wordmark -->
    <template #nav-bar-title-after>
      <span class="sf-version">v0.1</span>
    </template>
  </Layout>
</template>
