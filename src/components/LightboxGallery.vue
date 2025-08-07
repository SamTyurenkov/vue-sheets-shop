<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
    @click="closeLightbox">

    <!-- Main image container -->
    <div class="relative max-w-4xl max-h-full p-4 pb-40 sm:pb-20" @click.stop>
      <!-- Loading indicator -->
      <div v-if="loadingImages[currentImage.id]"
        class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div class="text-white text-lg">Loading image...</div>
      </div>

      <img :src="getImageUrl(currentImage)" :alt="currentImage.name"
        class="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain" />

      <!-- Image counter -->
      <div v-if="images.length > 1"
        class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        {{ currentIndex + 1 }} / {{ images.length }}
      </div>
    </div>

    <!-- Thumbnail navigation -->
    <div v-if="images.length > 1"
      class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1 sm:gap-3 overflow-hidden max-w-full px-4">
      <button v-for="(image, index) in images" :key="image.id" @click.stop="goToImage(index)"
        class="flex-shrink-0 w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 border-2 rounded overflow-hidden transition-transform"
        :class="index === currentIndex ? 'border-white' : 'border-transparent'">
        <img :src="getImageUrl(image)" :alt="image.name" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { config } from '../config/env.js'
import imageCacheService from '../services/imageCacheService.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  images: {
    type: Array,
    default: () => []
  },
  initialIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close'])

const currentIndex = ref(props.initialIndex)
const imageBlobs = ref({}) // Cache for blob URLs
const loadingImages = ref({}) // Track loading state

const currentImage = computed(() => {
  return props.images[currentIndex.value] || {}
})

// Fetch image using global cache service
async function fetchImageAsBlob(fileId) {
  if (imageBlobs.value[fileId]) {
    return imageBlobs.value[fileId]
  }

  if (loadingImages.value[fileId]) {
    return null // Already loading
  }

  loadingImages.value[fileId] = true

  try {
    // Use global cache service
    const blobUrl = await imageCacheService.getOrFetchImage(fileId, 'high', config.GOOGLE_DRIVE_API_KEY)

    if (blobUrl) {
      imageBlobs.value[fileId] = blobUrl
      console.log('Successfully fetched image from cache/API for file:', fileId)
      return blobUrl
    }

    return null
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  } finally {
    loadingImages.value[fileId] = false
  }
}

// Get the best available image URL with global cache support
function getImageUrl(image) {
  if (!image) return ''

  // If we have a blob URL, use it
  if (imageBlobs.value[image.id]) {
    return imageBlobs.value[image.id]
  }

  // Check global cache
  const cachedUrl = imageCacheService.getCachedImage(image.id, 'high')
  if (cachedUrl) {
    imageBlobs.value[image.id] = cachedUrl
    return cachedUrl
  }

  // Otherwise use thumbnail as fallback
  return image.thumbnailLink || image.imageUrl
}

// Preload current and adjacent images
async function preloadImages() {
  if (!props.isOpen || props.images.length === 0) return

  const current = props.images[currentIndex.value]
  if (current && current.id) {
    await fetchImageAsBlob(current.id)
  }

  // Preload next image
  const nextIndex = (currentIndex.value + 1) % props.images.length
  const nextImage = props.images[nextIndex]
  if (nextImage && nextImage.id) {
    fetchImageAsBlob(nextImage.id)
  }

  // Preload previous image
  const prevIndex = currentIndex.value === 0 ? props.images.length - 1 : currentIndex.value - 1
  const prevImage = props.images[prevIndex]
  if (prevImage && prevImage.id) {
    fetchImageAsBlob(prevImage.id)
  }
}

function closeLightbox() {
  emit('close')
}

function nextImage() {
  if (props.images.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % props.images.length
    preloadImages()
  }
}

function previousImage() {
  if (props.images.length > 1) {
    currentIndex.value = currentIndex.value === 0
      ? props.images.length - 1
      : currentIndex.value - 1
    preloadImages()
  }
}

function goToImage(index) {
  currentIndex.value = index
  preloadImages()
}

// Handle keyboard navigation
function handleKeydown(event) {
  if (!props.isOpen) return

  switch (event.key) {
    case 'Escape':
      closeLightbox()
      break
    case 'ArrowLeft':
      previousImage()
      break
    case 'ArrowRight':
      nextImage()
      break
  }
}

// Reset current index when lightbox opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentIndex.value = props.initialIndex
    preloadImages()
  }
})

// Clean up blob URLs when component unmounts
onUnmounted(() => {
  Object.values(imageBlobs.value).forEach(blobUrl => {
    URL.revokeObjectURL(blobUrl)
  })
  document.removeEventListener('keydown', handleKeydown)
})

// Add keyboard event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
</script>