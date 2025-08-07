<template>
    <div class="w-full min-w-0">
        <swiper-container ref="swiperRef" slides-per-view="1" space-between="10"
            :pagination="{ clickable: true, dynamicBullets: true }" navigation="true" :loop="images.length > 1"
            @swiperprogress="onProgress" @swiperslidechange="onSlideChange"
            class="image-swiper w-full max-w-full rounded">
            <swiper-slide v-for="(image, index) in images" :key="image.id" class="swiper-slide">
                <div class="relative group cursor-pointer w-full">
                    <!-- Loading state for individual image -->
                    <div v-if="loadingImages[image.id]"
                        class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded z-10">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>

                    <!-- Thumbnail (always visible for fast render) -->
                    <img :src="thumbnailUrls[image.id] || image.thumbnailLink || image.imageUrl" :alt="image.name"
                        :fetchpriority="index === 0 ? 'high' : 'low'" :loading="index === 0 ? 'eager' : 'lazy'"
                        class="w-full h-64 rounded hover:shadow-lg transition-shadow cursor-pointer !object-cover"
                        @click="openLightbox(images, images.indexOf(image))" />

                    <!-- High quality image overlay (only for active slide) -->
                    <img v-if="imageUrls[image.id] && isActiveSlide(image.id)" :src="imageUrls[image.id]"
                        :alt="image.name"
                        class="absolute inset-0 w-full h-64 rounded hover:shadow-lg transition-shadow cursor-pointer !object-cover duration-300 opacity-100 z-10"
                        @load="onImageLoad" @error="onImageError"
                        @click="openLightbox(images, images.indexOf(image))" />
                </div>
            </swiper-slide>
        </swiper-container>
    </div>
</template>

<script setup>
import { onMounted, nextTick, watch, ref, reactive } from 'vue'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import imageCacheService from '../services/imageCacheService.js'
import { config } from '../config/env.js'

const props = defineProps({
    images: {
        type: Array,
        default: () => []
    },
    loadingImages: {
        type: Object,
        default: () => ({})
    }
})

const emit = defineEmits(['openLightbox'])

const swiperRef = ref(null)

// Reactive object to store image URLs (thumbnail -> full image)
const imageUrls = reactive({})
const thumbnailUrls = reactive({}) // Store thumbnail URLs
const loadedFullImages = reactive({}) // Track which full images are loaded
const activeSlideIndex = ref(0) // Track current active slide

// Check if an image is the active slide
function isActiveSlide(imageId) {
    if (!props.images || activeSlideIndex.value < 0 || activeSlideIndex.value >= props.images.length) return false
    const activeImage = props.images[activeSlideIndex.value]
    return activeImage && activeImage.id === imageId
}

// Initialize thumbnail URLs for all images
async function initializeThumbnails() {
    if (!props.images) return

    for (const image of props.images) {
        if (image && image.id && !thumbnailUrls[image.id]) {
            const thumbnailUrl = await imageCacheService.getOrFetchImage(image.id, 'thumbnail')
            if (thumbnailUrl) {
                thumbnailUrls[image.id] = thumbnailUrl
                return thumbnailUrl
            }
        }
    }
}

// Load full image in background with priority handling
async function loadFullImage(image) {
    try {
        console.log('Loading full image for:', image.id)

        // Try to get full image from cache first
        const cachedUrl = imageCacheService.getCachedImage(image.id, 'high')
        if (cachedUrl) {
            console.log('Found cached full image for:', image.id)
            imageUrls[image.id] = cachedUrl
            loadedFullImages[image.id] = true
            return
        }

        // If not cached, fetch it using the simplified API
        console.log('Fetching full image for:', image.id)
        const blobUrl = await imageCacheService.getOrFetchImage(image.id, 'high')
        if (blobUrl) {
            console.log('Successfully loaded full image for:', image.id)
            imageUrls[image.id] = blobUrl
            loadedFullImages[image.id] = true
        } else {
            console.log('Failed to load full image for:', image.id)
        }
    } catch (error) {
        console.error('Failed to load full image:', error)
    }
}

// Load images with priority - first image gets high priority, others are lazy loaded
async function loadImagesWithPriority() {
    if (!props.images || props.images.length === 0) return

    // Only load thumbnails initially for fast rendering
    // High quality images will be loaded when slides become active
    console.log('Loading thumbnails for fast render')
}

// Load full image when slide becomes active
async function loadImageForActiveSlide(activeIndex) {
    if (!props.images || activeIndex < 0 || activeIndex >= props.images.length) return

    const activeImage = props.images[activeIndex]
    if (activeImage && !imageUrls[activeImage.id]) {
        console.log('Loading high quality image for active slide:', activeImage.id)
        await loadFullImage(activeImage)
    }
}

// Open lightbox
async function openLightbox(images, initialIndex = 0) {
    // Load high quality images for lightbox if not already loaded
    const imagesToLoad = images.slice(Math.max(0, initialIndex - 1), initialIndex + 2) // Load current and adjacent images
    for (const image of imagesToLoad) {
        if (image && !imageUrls[image.id]) {
            console.log('Loading high quality image for lightbox:', image.id)
            await loadFullImage(image)
        }
    }

    emit('openLightbox', images, initialIndex)
}

// Handle image load
function onImageLoad(event) {
    const img = event.target

    // Wait for natural dimensions to be available
    if (img.naturalWidth && img.naturalHeight) {
        // Fix orientation if needed
        if (img.naturalWidth > img.naturalHeight) {
            // Landscape image - use contain to show full image
            img.style.objectFit = 'contain'
        } else {
            // Portrait image - use cover to fill the space better
            img.style.objectFit = 'cover'
        }
    } else {
        // Fallback to contain if dimensions not available
        img.style.objectFit = 'contain'
    }

    // Swiper Web Component handles updates automatically
    // No need to manually call update() for Web Components
}

// Handle image error
function onImageError(event) {
    const img = event.target
    img.style.objectFit = 'cover'
    console.error('Failed to load image:', img.src)
}

// Swiper event handlers
function onProgress(event) {
    const [swiper, progress] = event.detail
    console.log('Swiper progress:', progress)
}

function onSlideChange(event) {
    const [swiper] = event.detail
    console.log('Slide changed to:', swiper.activeIndex)
    activeSlideIndex.value = swiper.activeIndex // Update active slide index
    // Load full image for the newly active slide
    loadImageForActiveSlide(swiper.activeIndex)
}

// Watch for changes in images array and update swiper
watch(() => props.images, async (newImages) => {
    if (newImages && newImages.length > 0) {
        // Initialize thumbnails for all images for fast rendering
        await initializeThumbnails()

        // Only load thumbnails initially - high quality images loaded on demand
        loadImagesWithPriority()

        // Swiper Web Component handles updates automatically
        // No need to manually call update() for Web Components
    }
}, { deep: true })

onMounted(async () => {
    // Initialize thumbnails if images are already available
    if (props.images && props.images.length > 0) {
        await initializeThumbnails()
    }

    // Load images with priority if they're already available
    if (props.images && props.images.length > 0) {
        await loadImagesWithPriority()
    }

    // Swiper Web Component initializes automatically
    // No need to manually call update() for Web Components
})
</script>

<style>
/* Using Swiper CSS parts for white navigation and pagination */
swiper-container::part(button-prev),
swiper-container::part(button-next) {
    color: white;
    background-color: transparent;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.3s ease;
}

swiper-container::part(bullet) {
    background-color: white;
    opacity: 0.7;
    width: 10px;
    height: 10px;
    margin: 4px;
    transform: scale(1);
    left: unset;
}

swiper-container::part(bullet-active) {
    background-color: white;
    opacity: 1;
    width: 10px;
    height: 10px;
    margin: 4px;
    transform: scale(1);
    left: unset;
}

swiper-container::part(button-prev):hover,
swiper-container::part(button-next):hover,
swiper-container::part(bullet):hover {
    opacity: 0.7;
}
</style>
