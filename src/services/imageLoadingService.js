import imageCacheService from './imageCacheService.js'
import { config } from '../config/env.js'

class ImageLoadingService {
  constructor() {
    this.loadingImages = new Map() // Track loading state for individual images
    this.imageBlobs = new Map() // Cache for blob URLs
  }

  // Get the best available image URL with thumbnail-first approach
  getImageUrl(image) {
    if (!image) return ''

    // If we have a blob URL, use it
    if (this.imageBlobs.has(image.id)) {
      return this.imageBlobs.get(image.id)
    }

    // Check global cache
    const cachedUrl = imageCacheService.getCachedImage(image.id, 'high')
    if (cachedUrl) {
      this.imageBlobs.set(image.id, cachedUrl)
      return cachedUrl
    }

    // Otherwise use thumbnail as fallback and start loading full image
    const thumbnailUrl = image.thumbnailLink || image.imageUrl
    if (thumbnailUrl && !this.imageBlobs.has(image.id)) {
      // Start loading full image in background
      this.loadFullImage(image)
    }
    
    return thumbnailUrl
  }

  // Load full image in background
  async loadFullImage(image) {
    if (this.loadingImages.has(image.id)) {
      return // Already loading
    }

    this.loadingImages.set(image.id, true)

    try {
      // Try to get full image from cache first
      const cachedUrl = imageCacheService.getCachedImage(image.id, 'high')
      if (cachedUrl) {
        this.imageBlobs.set(image.id, cachedUrl)
        return cachedUrl
      }

      // If not cached, fetch it using the Google Drive API with proper authentication
      const blobUrl = await imageCacheService.getOrFetchImage(image.id, 'high', config.GOOGLE_DRIVE_API_KEY)
      if (blobUrl) {
        this.imageBlobs.set(image.id, blobUrl)
        return blobUrl
      }
    } catch (error) {
      console.error('Failed to load full image:', error)
    } finally {
      this.loadingImages.delete(image.id)
    }
  }

  // Preload images for better performance
  async preloadImages(images, count = 3) {
    const imagesToPreload = images.slice(0, count)
    const preloadPromises = imagesToPreload.map(image => {
      if (image.id) {
        return this.loadFullImage(image)
      }
      return Promise.resolve()
    })
    
    await Promise.all(preloadPromises)
  }

  // Check if an image is currently loading
  isLoading(imageId) {
    return this.loadingImages.has(imageId)
  }

  // Get loading state object for Vue reactivity
  getLoadingState() {
    const state = {}
    this.loadingImages.forEach((value, key) => {
      state[key] = value
    })
    return state
  }

  // Clear all cached data
  clearCache() {
    this.imageBlobs.forEach(blobUrl => {
      URL.revokeObjectURL(blobUrl)
    })
    this.imageBlobs.clear()
    this.loadingImages.clear()
  }
}

// Create singleton instance
const imageLoadingService = new ImageLoadingService()

export default imageLoadingService
