// Google Drive utility functions

/**
 * Validates if a URL is a valid Google Drive folder URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Google Drive folder URL
 */
export function isValidDriveFolderUrl(url) {
  if (!url || typeof url !== 'string') return false
  
  const driveFolderPattern = /^https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9-_]+/
  return driveFolderPattern.test(url)
}

/**
 * Extracts folder ID from Google Drive URL
 * @param {string} url - The Google Drive folder URL
 * @returns {string|null} - The folder ID or null if invalid
 */
export function extractFolderId(url) {
  if (!isValidDriveFolderUrl(url)) return null
  
  const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * Creates a direct image URL from Google Drive file ID
 * @param {string} fileId - The Google Drive file ID
 * @returns {string} - Direct image URL
 */
export function createImageUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`
}

/**
 * Creates a thumbnail URL from Google Drive file ID
 * @param {string} fileId - The Google Drive file ID
 * @returns {string} - Thumbnail URL
 */
export function createThumbnailUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`
}

/**
 * Formats file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Checks if a file is an image based on MIME type
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean} - True if the file is an image
 */
export function isImageFile(mimeType) {
  return mimeType && mimeType.startsWith('image/')
} 