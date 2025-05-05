// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic security and optimization
app.use(compression());
app.use(cors());
app.disable('x-powered-by');

// Configure rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/proxy', limiter);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('CORS Proxy server is running. Use /proxy?url=YOUR_URL to make requests.');
});

// Main proxy endpoint
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).send('URL parameter is required');
  }
  
  try {
    // Validate URL format
    new URL(targetUrl);
    
    // Optional: whitelist checking
    // if (!isWhitelisted(targetUrl)) {
    //   return res.status(403).send('This URL is not allowed');
    // }
    
    // Log request (optional)
    console.log(`Proxying request to: ${targetUrl}`);
    
    // Make the request to the target URL
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        // Forward select headers
        ...(req.headers.accept && { 'Accept': req.headers.accept }),
        ...(req.headers['accept-language'] && { 'Accept-Language': req.headers['accept-language'] }),
      },
      responseType: 'arraybuffer', // Handle both text and binary responses
      timeout: 10000, // 10 second timeout
    });
    
    // Set response headers
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    
    // Send response data
    res.send(response.data);
    
  } catch (error) {
    console.error(`Error proxying to ${targetUrl}:`, error.message);
    
    if (error.response) {
      // Forward the status code from the proxied server
      res.status(error.response.status).send(`Proxy error: ${error.message}`);
    } else {
      res.status(500).send(`Proxy error: ${error.message}`);
    }
  }
});

app.listen(PORT, () => {
  console.log(`CORS Proxy server running on port ${PORT}`);
});

// Helper function for whitelist checking (optional)
function isWhitelisted(url) {
  const allowedDomains = [
    'gematrix.org',
    'www.gematrix.org',
    'gematrinator.com',
    'www.gematrinator.com',
    'gematria.codes',
    'shematria.pythonanywhere.com'
  ];
  
  try {
    const hostname = new URL(url).hostname;
    return allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch (e) {
    return false;
  }
}
