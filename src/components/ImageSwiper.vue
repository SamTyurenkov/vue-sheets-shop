<template>
    <div class="w-full min-w-0">
        <swiper-container ref="swiperRef" slides-per-view="1" space-between="10" :pagination="{ clickable: true, dynamicBullets: true }"
            navigation="true" :loop="images.length > 1" @swiperprogress="onProgress" @swiperslidechange="onSlideChange"
            class="image-swiper w-full max-w-full">
            <swiper-slide v-for="image in images" :key="image.id" class="swiper-slide">
                <div class="relative group cursor-pointer w-full">
                    <!-- Loading state for individual image -->
                    <div v-if="loadingImages[image.id]"
                        class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>

                    <img :src="getImageUrl(image)" :alt="image.name"
                        class="w-full h-64 rounded hover:shadow-lg transition-shadow cursor-pointer"
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

// Get the best available image URL with thumbnail-first approach
function getImageUrl(image) {
    if (!image) return ''

    // If we have a cached full image, use it
    const cachedUrl = imageCacheService.getCachedImage(image.id, 'high')
    if (cachedUrl) {
        imageUrls[image.id] = cachedUrl
        return cachedUrl
    }

    // If we have a stored full image URL, use it
    if (imageUrls[image.id]) {
        return imageUrls[image.id]
    }

    // Otherwise use thumbnail as fallback and start loading full image
    const thumbnailUrl = image.thumbnailLink || image.imageUrl
    if (thumbnailUrl && !imageUrls[image.id]) {
        // Start loading full image in background
        loadFullImage(image)
    }
    
    return thumbnailUrl
}

// Load full image in background
async function loadFullImage(image) {
    try {
        // Try to get full image from cache first
        const cachedUrl = imageCacheService.getCachedImage(image.id, 'high')
        if (cachedUrl) {
            imageUrls[image.id] = cachedUrl
            return
        }

        // If not cached, try to fetch it
        if (image.imageUrl) {
            const response = await fetch(image.imageUrl)
            if (response.ok) {
                const blob = await response.blob()
                const blobUrl = URL.createObjectURL(blob)
                
                // Cache the image
                await imageCacheService.cacheImage(image.id, blob, 'high')
                
                // Update the reactive URL
                imageUrls[image.id] = blobUrl
            }
        }
    } catch (error) {
        console.error('Failed to load full image:', error)
    }
}

// Open lightbox
function openLightbox(images, initialIndex = 0) {
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
    
    // Update swiper after image loads
    nextTick(() => {
        if (swiperRef.value) {
            swiperRef.value.update()
        }
    })
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
}

// Watch for changes in images array and update swiper
watch(() => props.images, (newImages) => {
    if (newImages && newImages.length > 0) {
        // Start loading full images for visible slides
        newImages.forEach(image => {
            if (image && !imageUrls[image.id]) {
                loadFullImage(image)
            }
        })
        
        nextTick(() => {
            if (swiperRef.value) {
                swiperRef.value.update()
            }
        })
    }
}, { deep: true })

onMounted(() => {
    // Ensure swiper is properly initialized
    nextTick(() => {
        if (swiperRef.value && props.images.length > 0) {
            swiperRef.value.update()
        }
    })
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
