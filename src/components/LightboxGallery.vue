<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" @click="closeLightbox">
    <!-- Close button -->
    <button 
      @click="closeLightbox"
      class="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 transition-colors z-10"
    >
      ×
    </button>
    
    <!-- Navigation arrows -->
    <button 
      v-if="images.length > 1"
      @click.stop="previousImage"
      class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors z-10"
    >
      ‹
    </button>
    
    <button 
      v-if="images.length > 1"
      @click.stop="nextImage"
      class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors z-10"
    >
      ›
    </button>
    
         <!-- Main image container -->
     <div class="relative max-w-4xl max-h-full p-4" @click.stop>
       <!-- Loading indicator -->
       <div v-if="loadingImages[currentImage.id]" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
         <div class="text-white text-lg">Loading image...</div>
       </div>
       
       <img 
         :src="getImageUrl(currentImage)" 
         :alt="currentImage.name"
         class="max-w-full max-h-[80vh] object-contain"
       />
       
       <!-- Image counter -->
       <div v-if="images.length > 1" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
         {{ currentIndex + 1 }} / {{ images.length }}
       </div>
     </div>
    
         <!-- Thumbnail navigation -->
     <div v-if="images.length > 1" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
       <button
         v-for="(image, index) in images"
         :key="image.id"
         @click.stop="goToImage(index)"
         class="w-32 h-32 border-2 rounded overflow-hidden hover:scale-105 transition-transform"
         :class="index === currentIndex ? 'border-white' : 'border-gray-600'"
       >
         <img 
           :src="getImageUrl(image)" 
           :alt="image.name"
           class="w-full h-full object-cover"
         />
       </button>
     </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { config } from '../config/env.js'

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

// Fetch image as blob and create blob URL
async function fetchImageAsBlob(fileId) {
  if (imageBlobs.value[fileId]) {
    return imageBlobs.value[fileId]
  }

  if (loadingImages.value[fileId]) {
    return null // Already loading
  }

  loadingImages.value[fileId] = true

  try {
    // Check if API key is available
    if (!config.GOOGLE_DRIVE_API_KEY) {
      console.error('Google Drive API key is not configured')
      throw new Error('API key not configured')
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?supportsTeamDrives=true&alt=media&key=${config.GOOGLE_DRIVE_API_KEY}`
    console.log('Fetching image from:', url)
    
    const response = await fetch(url)
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      throw new Error(`Failed to fetch image: ${response.status} - ${errorText}`)
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    imageBlobs.value[fileId] = blobUrl
    console.log('Successfully created blob URL for file:', fileId)
    return blobUrl
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  } finally {
    loadingImages.value[fileId] = false
  }
}

// Get the best available image URL
function getImageUrl(image) {
  if (!image) return ''
  
  // If we have a blob URL, use it
  if (imageBlobs.value[image.id]) {
    return imageBlobs.value[image.id]
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