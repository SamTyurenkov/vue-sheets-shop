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
  <main class="max-h-screen max-w-full overflow-hidden h-[100vh] w-full">
    <router-view />
  </main>
</template>