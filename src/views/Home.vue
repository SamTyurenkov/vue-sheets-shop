<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import GoogleService from '../services/googleService.js'
import { config } from '../config/env.js'
import { isValidDriveFolderUrl } from '../utils/driveUtils.js'
import LightboxGallery from '../components/LightboxGallery.vue'
import imageCacheService from '../services/imageCacheService.js'
import ImageSwiper from '../components/ImageSwiper.vue'

const items = ref([])
const allData = ref([])
const page = ref(0)
const pageSize = 20
const loading = ref(false)
const finished = ref(false)
const imagesLoading = ref({}) // Track loading state for each item's images
const itemImages = ref({}) // Store images for each item
const imageBlobs = ref({}) // Cache for blob URLs (same as lightbox)
const loadingImages = ref({}) // Track loading state for individual images

// Lightbox state
const lightboxOpen = ref(false)
const lightboxImages = ref([])
const lightboxInitialIndex = ref(0)

// Initialize Google service
const googleService = new GoogleService(
  config.GOOGLE_DRIVE_API_KEY
)

async function fetchSheetData() {
  loading.value = true
  try {
    const rows = await googleService.fetchSheetData(config.SHEET_URL)
    allData.value = rows
    loadMore()
  } catch (e) {
    console.error('Failed to fetch sheet data', e)
  } finally {
    loading.value = false
  }
}

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

// Fetch images for a specific item
async function fetchImagesForItem(itemIndex, driveFolderUrl) {
  if (!driveFolderUrl || imagesLoading.value[itemIndex]) return

  imagesLoading.value[itemIndex] = true

  try {
    const images = await googleService.getImagesFromFolder(driveFolderUrl)
    itemImages.value[itemIndex] = images

    // Preload first few images for better performance
    const imagesToPreload = images.slice(0, 3) // Preload first 3 images
    const preloadPromises = imagesToPreload.map(image => {
      if (image.id) {
        return fetchImageAsBlob(image.id)
      }
      return Promise.resolve()
    })
    
    // Wait for preload to complete
    await Promise.all(preloadPromises)
    
    // Ensure DOM is updated before continuing
    await nextTick()
  } catch (error) {
    console.error(`Failed to fetch images for item ${itemIndex}:`, error)
    itemImages.value[itemIndex] = []
  } finally {
    imagesLoading.value[itemIndex] = false
  }
}

function loadMore() {
  if (finished.value || loading.value) return
  const start = page.value * pageSize
  const end = start + pageSize
  const nextItems = allData.value.slice(start, end)
  if (nextItems.length === 0) {
    finished.value = true
    return
  }
  items.value.push(...nextItems)
  page.value++

  // Fetch images for new items
  nextItems.forEach((item, index) => {
    const actualIndex = start + index
    const driveFolderUrl = item[config.COLUMNS.DRIVE_FOLDER_LINK]
    if (driveFolderUrl) {
      fetchImagesForItem(actualIndex, driveFolderUrl)
    }
  })
}

// Infinite scroll using Intersection Observer
const sentinel = ref(null)

function setupObserver() {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !loading.value && !finished.value) {
      loadMore()
    }
  })
  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
}

// Open lightbox with images from a specific item
function openLightbox(images, initialIndex = 0) {
  lightboxImages.value = images
  lightboxInitialIndex.value = initialIndex
  lightboxOpen.value = true
}

// Handle swiper lightbox open
function handleSwiperLightbox(images, initialIndex) {
  openLightbox(images, initialIndex)
}

// Close lightbox
function closeLightbox() {
  lightboxOpen.value = false
}

// Clean up blob URLs when component unmounts
onUnmounted(() => {
  // Note: Global cache handles its own cleanup, so we only clean up local blob URLs
  Object.values(imageBlobs.value).forEach(blobUrl => {
    URL.revokeObjectURL(blobUrl)
  })
})

onMounted(async () => {
  await fetchSheetData()
  setupObserver()
})
</script>
<template>
  <div class="max-w-4xl mx-auto p-4 relative overflow-hidden">
    <!-- <div class="mr-3 h-6 sm:h-9 w-6 sm:w-9"><img src="@/assets/logo.svg" class="object-cover w-full h-full" alt="Skit Logo"></div> -->
    <h1 class="text-2xl font-bold mb-4">Продаю в Красной Поляне</h1>

    <div class="grid gap-6 overflow-hidden">
      <div v-for="(item, idx) in items" :key="idx" class="border-t flex flex-wrap gap-y-4 pt-4 max-w-full overflow-hidden">

        <div class="basis-full sm:basis-1/2 order-2 sm:order-1 sm:pe-4">
          <!-- Item Details -->
          <h3 class="text-lg font-semibold mb-0">{{ item[config.COLUMNS.NAME] || 'Untitled' }}</h3>
          <p class="text-gray-600">{{ item[config.COLUMNS.DESCRIPTION] || 'No description' }}</p>


          <p class="text-green-600 font-medium">₽ {{ item[config.COLUMNS.PRICE] || '0' }}</p>

          <p class="mt-4 font-medium">{{ item[config.COLUMNS.STATUS] || '' }}</p>
        </div>


        <div class="basis-full sm:basis-1/2 order-1 sm:order-2 min-w-0" v-if="item[config.COLUMNS.DRIVE_FOLDER_LINK]">
          <!-- Images Section -->
          <!-- Loading State -->
          <div v-if="imagesLoading[idx]" class="flex items-center justify-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-2">Загружаю картинки...</span>
          </div>

          <!-- Images -->
          <ImageSwiper v-else-if="itemImages[idx] && itemImages[idx].length > 0" class="w-full min-w-0"
            :key="`swiper-${idx}-${itemImages[idx].length}`"
            :images="itemImages[idx]" :loading-images="loadingImages" @open-lightbox="handleSwiperLightbox" />


        </div>
      </div>
    </div>

    <div ref="sentinel" style="height: 40px;"></div>
    <div v-if="loading" class="text-center py-2">Загружаю еще...</div>
    <div v-if="finished" class="text-center py-2 text-gray-500">Больше ничего нет</div>

    <!-- Lightbox Gallery -->
    <LightboxGallery :is-open="lightboxOpen" :images="lightboxImages" :initial-index="lightboxInitialIndex"
      @close="closeLightbox" />

    <div class="fixed pointer-events-none bottom-3 start-0 w-full z-10">
      <div class="max-w-4xl w-[100vw] mx-auto flex gap-3 *:block justify-end pe-3">
        <a class="bg-[#158a2e] pointer-events-auto rounded-full *:fill-white p-[6px] hover:bg-[#2dab48]"
          href="https://wa.me/+79819190599" rel="noindex nofollow noopener noreferrer" target="_blank">
          <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
            <path
              d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z">
            </path>
          </svg>
        </a>
        <a class="bg-[#0088cc] pointer-events-auto rounded-full *:fill-white p-[6px] hover:bg-[#3daae0]"
          href="https://t.me/sam_tyurenkov" rel="noindex nofollow noopener noreferrer" target="_blank">
          <svg class="relative -start-[1px]" width="30" height="30" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512">
            <path
              d="M446.7 98.6l-67.6 318.8c-5.1 22.5-18.4 28.1-37.3 17.5l-103-75.9-49.7 47.8c-5.5 5.5-10.1 10.1-20.7 10.1l7.4-104.9 190.9-172.5c8.3-7.4-1.8-11.5-12.9-4.1L117.8 284 16.2 252.2c-22.1-6.9-22.5-22.1 4.6-32.7L418.2 66.4c18.4-6.9 34.5 4.1 28.5 32.2z">
            </path>
          </svg>
        </a>
      </div>
    </div>

  </div>
</template>