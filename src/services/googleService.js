import { extractFolderId, createImageUrl, createThumbnailUrl, formatFileSize } from '../utils/driveUtils.js'

class GoogleService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseUrl = 'https://www.googleapis.com/drive/v3'
  }

  // Get authorization headers (simplified for API key only)
  getAuthHeaders() {
    return {} // API key is passed as URL parameter
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
      let url = `${this.baseUrl}/files?q=${query}&fields=files(id,name,webContentLink,thumbnailLink,size)&orderBy=name&key=${this.apiKey}`

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log(data);

      return data.files.map(file => ({
        id: file.id,
        name: file.name,
        webContentLink: file.webContentLink,
        thumbnailLink: file.thumbnailLink || createThumbnailUrl(file.id),
        size: file.size,
        formattedSize: formatFileSize(file.size),
        // Create direct image URL
        imageUrl: createImageUrl(file.id)
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

      let url = `${this.baseUrl}/files/${imageId}?fields=id,name,webContentLink,thumbnailLink,size&key=${this.apiKey}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`)
      }

      const file = await response.json()

      return {
        id: file.id,
        name: file.name,
        webContentLink: file.webContentLink,
        thumbnailLink: file.thumbnailLink || createThumbnailUrl(file.id),
        size: file.size,
        formattedSize: formatFileSize(file.size),
        imageUrl: createImageUrl(file.id)
      }
    } catch (error) {
      console.error('Error fetching image by ID:', error)
      throw error
    }
  }

  // Test if the API key is valid
  async testApiKey() {
    try {
      if (!this.apiKey) {
        return { valid: false, error: 'No API key provided' }
      }

      // Try to fetch a non-existent file to test the authentication
      const url = `${this.baseUrl}/files/test?key=${this.apiKey}`
      const response = await fetch(url)
      
      // If we get a 400 or 403, the authentication is invalid
      if (response.status === 400 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' }
      }
      
      return { valid: true }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }
}

export default GoogleService 