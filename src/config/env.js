// Environment configuration
export const config = {
  // Google Drive API Key - from environment variables
  GOOGLE_DRIVE_API_KEY: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '',
  
  // Google Sheets URL
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1vcqTCWuqm8qd_MwEvuJOISLxq968FDvFXoc6WIuWSY8/gviz/tq?tqx=out:json',
  
  // Column indices (assuming the Google Drive folder link is in a specific column)
  // Adjust these based on your actual sheet structure
  COLUMNS: {
    NAME: 0,
    DESCRIPTION: 1,
    DRIVE_FOLDER_LINK: 2, // Column containing Google Drive folder links
    PRICE: 3,
    STATUS: 4,
    // Add more columns as needed
  }
}

export default config 