// Import the qrcode package
const QRCode = require('qrcode');

// Define your website URL
const websiteURL = 'https://polyana-sale.web.app';

// Generate the QR code as a string (for terminal output)
QRCode.toString(websiteURL, { type: 'terminal' }, (err, qrCodeString) => {
  if (err) {
    console.error('Error generating QR code:', err);
    return;
  }
  console.log('QR Code for your website:');
  console.log(qrCodeString);
});

// Generate the QR code as an image file (e.g., PNG)
QRCode.toFile('./qrcode.png', websiteURL, { 
  errorCorrectionLevel: 'H',
  width: 900  // Increase width to make QR code bigger (default is 256)
}, (err) => {
  if (err) {
    console.error('Error saving QR code image:', err);
    return;
  }
  console.log('QR code saved as qrcode.png');
});