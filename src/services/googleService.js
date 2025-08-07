import { extractFolderId, createImageUrl, createThumbnailUrl, formatFileSize } from '../utils/driveUtils.js'
import { config } from '../config/env.js'

class GoogleService {
  constructor() {
    this.apiKey = config.GOOGLE_DRIVE_API_KEY
    this.baseUrl = 'https://www.googleapis.com/drive/v3'
  }

  // Get authorization headers with API key
  getAuthHeaders() {
    return {
      'x-goog-api-key': this.apiKey
    }
  }

  // Google Sheets functionality
  async fetchSheetData(sheetUrl) {
    try {
      const res = await fetch(sheetUrl)
      const text = await res.text()
      // Google Sheets JSON is wrapped, so we need to parse it
      const json = JSON.parse(text.substring(47, text.length - 2))
      console.log('Sheet data:', json)
      const rows = json.table.rows.map(row => row.c.map(cell => cell?.v || ''))
      return rows
    } catch (error) {
      console.error('Failed to fetch sheet data:', error)
      throw error
    }
  }

  // Extract folder ID from Google Drive URL
  extractFolderId(url) {
    return extractFolderId(url)
  }

  // Fetch all images from a Google Drive folder using direct HTTP requests
  async getImagesFromFolder(folderUrl) {
    try {
      const folderId = this.extractFolderId(folderUrl)
      if (!folderId) {
        throw new Error('Invalid Google Drive folder URL')
      }

      if (!this.apiKey) {
        throw new Error('Google Drive API key is required')
      }

      // Build the query for files in the folder that are images
      const query = encodeURIComponent(`'${folderId}' in parents and (mimeType contains 'image/')`)
      let url = `${this.baseUrl}/files?q=${query}&fields=files(id,name,thumbnailLink,size)&orderBy=name&key=${this.apiKey}`

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log(data);

      return data.files.map(file => ({
        id: file.id,
        name: file.name,
        thumbnailLink: file.thumbnailLink || createThumbnailUrl(file.id),
        size: file.size
      }))
    } catch (error) {
      console.error('Error fetching images from Google Drive:', error)
      throw error
    }
  }

  // Get a single image by ID using direct HTTP requests
  async getImageById(imageId) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Drive API key is required')
      }

      let url = `${this.baseUrl}/files/${imageId}?fields=id,name,thumbnailLink,size`
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`)
      }

      const file = await response.json()

      return {
        id: file.id,
        name: file.name,
        thumbnailLink: file.thumbnailLink || createThumbnailUrl(file.id),
        size: file.size,
      }
    } catch (error) {
      console.error('Error fetching image by ID:', error)
      throw error
    }
  }

  // Fetch thumbnail image
  async fetchThumbnail(thumbnailLink) {
    try {
      const response = await fetch(thumbnailLink)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch thumbnail: ${response.status} ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Error fetching thumbnail:', error)
      throw error
    }
  }

  // Fetch high-quality image using thumbnail link modification
  async fetchHighQualityImage(thumbnailLink) {
    try {
      // Replace the size parameter from s=220 to s=2048 for high quality
      let highQualityUrl = thumbnailLink.replace(/=s\d+/, '=s2048')
      console.log(`Fetching high-quality image: ${thumbnailLink} -> ${highQualityUrl}`)
      
      const response = await fetch(highQualityUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch high-quality image: ${response.status} ${response.statusText}`)
      }
      return await response.blob()
    } catch (error) {
      console.error('Error fetching high-quality image:', error)
      throw error
    }
  }
}

export default GoogleService 