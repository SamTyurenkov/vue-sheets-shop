import GoogleService from './googleService.js'

class ImageCacheService {
  constructor() {
    this.memoryCache = new Map() // In-memory cache for current session
    this.cacheKey = 'polyana_image_cache'
    this.maxCacheSize = 50 * 1024 * 1024 // 50MB cache limit
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    this.googleService = null // Will be initialized
  }

  // Initialize googleService
  initialize() {
    this.googleService = new GoogleService() // No need to pass API key
  }

  // Get or initialize googleService
  getGoogleService() {
    if (!this.googleService) {
      this.initialize()
    }
    return this.googleService
  }

  // Generate a unique cache key for an image
  generateCacheKey(fileId, quality = 'high') {
    return `img_${fileId}_${quality}`
  }

  // Get cache info from localStorage
  getCacheInfo() {
    try {
      const cached = localStorage.getItem(this.cacheKey)
      return cached ? JSON.parse(cached) : { images: {}, metadata: { size: 0, lastCleanup: Date.now() } }
    } catch (error) {
      console.warn('Failed to read cache from localStorage:', error)
      return { images: {}, metadata: { size: 0, lastCleanup: Date.now() } }
    }
  }

  // Save cache info to localStorage
  saveCacheInfo(cacheInfo) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheInfo))
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error)
      // If localStorage is full, try to clean up old entries
      this.cleanupCache()
    }
  }

  // Check if image is cached
  isCached(fileId, quality = 'high') {
    const cacheKey = this.generateCacheKey(fileId, quality)
    
    // Check memory cache first (fastest)
    if (this.memoryCache.has(cacheKey)) {
      return true
    }

    // Check localStorage
    const cacheInfo = this.getCacheInfo()
    return cacheInfo.images[cacheKey] && 
           cacheInfo.images[cacheKey].expiry > Date.now()
  }

  // Get cached image
  getCachedImage(fileId, quality = 'high') {
    const cacheKey = this.generateCacheKey(fileId, quality)
    
    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)
    }

    // Check localStorage
    const cacheInfo = this.getCacheInfo()
    const cachedImage = cacheInfo.images[cacheKey]
    
    if (cachedImage && cachedImage.expiry > Date.now()) {
      // Convert base64 back to blob URL
      const blob = this.base64ToBlob(cachedImage.data, cachedImage.mimeType)
      const blobUrl = URL.createObjectURL(blob)
      
      // Store in memory cache for faster access
      this.memoryCache.set(cacheKey, blobUrl)
      
      return blobUrl
    }

    return null
  }

  // Cache an image
  async cacheImage(fileId, blob, quality = 'high') {
    const cacheKey = this.generateCacheKey(fileId, quality)
    
    try {
      // Convert blob to base64 for localStorage
      const base64 = await this.blobToBase64(blob)
      const mimeType = blob.type
      
      // Create cache entry
      const cacheEntry = {
        data: base64,
        mimeType: mimeType,
        size: base64.length,
        expiry: Date.now() + this.cacheExpiry,
        timestamp: Date.now()
      }

      // Store in memory cache
      const blobUrl = URL.createObjectURL(blob)
      this.memoryCache.set(cacheKey, blobUrl)

      // Store in localStorage
      const cacheInfo = this.getCacheInfo()
      cacheInfo.images[cacheKey] = cacheEntry
      cacheInfo.metadata.size += cacheEntry.size

      // Cleanup if cache is too large
      if (cacheInfo.metadata.size > this.maxCacheSize) {
        this.cleanupCache()
      } else {
        this.saveCacheInfo(cacheInfo)
      }

      console.log(`Cached image: ${fileId} (${quality})`)
      return blobUrl
    } catch (error) {
      console.error('Failed to cache image:', error)
      return null
    }
  }

  // Convert blob to base64
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1]) // Remove data URL prefix
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Convert base64 to blob
  base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  // Cleanup old cache entries
  cleanupCache() {
    const cacheInfo = this.getCacheInfo()
    const now = Date.now()
    
    // Remove expired entries
    Object.keys(cacheInfo.images).forEach(key => {
      if (cacheInfo.images[key].expiry <= now) {
        cacheInfo.metadata.size -= cacheInfo.images[key].size
        delete cacheInfo.images[key]
      }
    })

    // If still too large, remove oldest entries
    if (cacheInfo.metadata.size > this.maxCacheSize) {
      const entries = Object.entries(cacheInfo.images)
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      while (cacheInfo.metadata.size > this.maxCacheSize && entries.length > 0) {
        const [key, entry] = entries.shift()
        cacheInfo.metadata.size -= entry.size
        delete cacheInfo.images[key]
      }
    }

    cacheInfo.metadata.lastCleanup = now
    this.saveCacheInfo(cacheInfo)
    
    console.log('Cache cleanup completed')
  }

  // Get cache statistics
  getCacheStats() {
    const cacheInfo = this.getCacheInfo()
    const now = Date.now()
    
    let totalEntries = 0
    let validEntries = 0
    let totalSize = 0
    
    Object.values(cacheInfo.images).forEach(entry => {
      totalEntries++
      if (entry.expiry > now) {
        validEntries++
        totalSize += entry.size
      }
    })

    return {
      totalEntries,
      validEntries,
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      memoryCacheSize: this.memoryCache.size,
      maxCacheSizeMB: (this.maxCacheSize / (1024 * 1024)).toFixed(2)
    }
  }

  // Clear all cache
  clearCache() {
    // Clear memory cache
    this.memoryCache.forEach(blobUrl => {
      URL.revokeObjectURL(blobUrl)
    })
    this.memoryCache.clear()

    // Clear localStorage
    localStorage.removeItem(this.cacheKey)
    
    console.log('Cache cleared')
  }

  // Preload images for better performance
  async preloadImages(fileIds, quality = 'high') {
    const promises = fileIds.map(fileId => {
      if (!this.isCached(fileId, quality)) {
        // This will trigger the fetch and cache process
        return this.getOrFetchImage(fileId, quality)
      }
      return Promise.resolve()
    })

    await Promise.allSettled(promises)
  }

  // Get image from cache or fetch if not cached
  async getOrFetchImage(fileId, quality = 'high') {
    // Get or initialize googleService
    const googleService = this.getGoogleService()

    // Check cache first
    const cached = this.getCachedImage(fileId, quality)
    if (cached) {
      return cached
    }

    // Fetch using googleService
    try {
      let blob = null

      if (quality === 'thumbnail') {
        // Get image metadata to get thumbnailLink
        const imageData = await googleService.getImageById(fileId)
        const thumbnailLink = imageData.thumbnailLink
        blob = await googleService.fetchThumbnail(thumbnailLink)
      } else if (quality === 'high') {
        // Get image metadata to get thumbnailLink
        const imageData = await googleService.getImageById(fileId)
        const thumbnailLink = imageData.thumbnailLink
        blob = await googleService.fetchHighQualityImage(thumbnailLink)
      }

      if (blob) {
        return await this.cacheImage(fileId, blob, quality)
      }
    } catch (error) {
      console.error('Failed to fetch image:', error)
    }

    return null
  }
}

// Create singleton instance
const imageCacheService = new ImageCacheService()

export default imageCacheService
