<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";

// Preload images on app initialization
onMounted(() => {
});

// Cleanup event listener
onUnmounted(() => {
});
</script>
<template>
  <main class="max-w-full overflow-hidden w-full">
    <router-view />
  </main>
</template>