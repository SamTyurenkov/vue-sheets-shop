<template>
    <div class="w-full min-w-0">
        <swiper-container slides-per-view="1" space-between="10" :pagination="{ clickable: true, dynamicBullets: true }"
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
                        class="w-full h-64 object-cover rounded border hover:shadow-lg transition-shadow cursor-pointer"
                        @click="openLightbox(images, images.indexOf(image))" />
                </div>
            </swiper-slide>
        </swiper-container>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
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

// Get the best available image URL with global cache support
function getImageUrl(image) {
    if (!image) return ''

    // Check global cache
    const cachedUrl = imageCacheService.getCachedImage(image.id, 'high')
    if (cachedUrl) {
        return cachedUrl
    }

    // Otherwise use thumbnail as fallback
    return image.thumbnailLink || image.imageUrl
}

// Open lightbox
function openLightbox(images, initialIndex = 0) {
    emit('openLightbox', images, initialIndex)
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
