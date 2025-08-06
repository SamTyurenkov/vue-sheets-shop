<script setup>
import { ref, onMounted } from 'vue'
import GoogleService from '../services/googleService.js'
import { config } from '../config/env.js'
import { isValidDriveFolderUrl } from '../utils/driveUtils.js'
import LightboxGallery from '../components/LightboxGallery.vue'

const items = ref([])
const allData = ref([])
const page = ref(0)
const pageSize = 20
const loading = ref(false)
const finished = ref(false)
const imagesLoading = ref({}) // Track loading state for each item's images
const itemImages = ref({}) // Store images for each item
const apiKeyValid = ref(false)
const apiKeyError = ref('')

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

// Fetch images for a specific item
async function fetchImagesForItem(itemIndex, driveFolderUrl) {
  if (!driveFolderUrl || imagesLoading.value[itemIndex]) return

  imagesLoading.value[itemIndex] = true

  try {
    const images = await googleService.getImagesFromFolder(driveFolderUrl)
    itemImages.value[itemIndex] = images
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

// Close lightbox
function closeLightbox() {
  lightboxOpen.value = false
}

onMounted(async () => {
  // Test authentication first
  if (config.GOOGLE_DRIVE_API_KEY) {
    const testResult = await googleService.testApiKey()
    apiKeyValid.value = testResult.valid
    apiKeyError.value = testResult.error || ''
  }

  await fetchSheetData()
  setupObserver()
})
</script>
<template>
  <div class="max-w-4xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Продаю в Красной Поляне</h1>

    <div class="grid gap-6">
      <div v-for="(item, idx) in items" :key="idx" class="border-t flex flex-wrap gap-y-4 pt-4">

        <div class="basis-full md:basis-1/2 order-2 md:order-1">
          <!-- Item Details -->
          <h3 class="text-lg font-semibold">{{ item[config.COLUMNS.NAME] || 'Untitled' }}</h3>
          <p class="text-gray-600">{{ item[config.COLUMNS.DESCRIPTION] || 'No description' }}</p>


          <p class="text-green-600 font-medium">₽ {{ item[config.COLUMNS.PRICE] || '0' }}</p>

          <p class="mt-4 font-medium">{{ item[config.COLUMNS.STATUS] || '' }}</p>
        </div>


        <div class="basis-full md:basis-1/2 order-1 md:order-2">
          <!-- Images Section -->
          <div v-if="item[config.COLUMNS.DRIVE_FOLDER_LINK]" class="mt-4">
            <!-- Loading State -->
            <div v-if="imagesLoading[idx]" class="flex items-center justify-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span class="ml-2">Загружаю картинки...</span>
            </div>

            <!-- Images -->
            <div v-else-if="itemImages[idx] && itemImages[idx].length > 0"
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-4">
              <div v-for="image in itemImages[idx]" :key="image.id" class="relative group cursor-pointer">
                <img :src="image.thumbnailLink || image.imageUrl" :alt="image.name"
                  class="w-full h-24 object-cover rounded border hover:shadow-lg transition-shadow cursor-pointer"
                  @click="openLightbox(itemImages[idx], itemImages[idx].indexOf(image))" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ref="sentinel" style="height: 40px;"></div>
    <div v-if="loading" class="text-center py-2">Загружаю еще...</div>
    <div v-if="finished" class="text-center py-2 text-gray-500">Больше ничего нет</div>

    <!-- Lightbox Gallery -->
    <LightboxGallery :is-open="lightboxOpen" :images="lightboxImages" :initial-index="lightboxInitialIndex"
      @close="closeLightbox" />
  </div>
</template>