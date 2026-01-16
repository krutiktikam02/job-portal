import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let cachedToken = null
let tokenExpiry = null

// Load service account key
const keyPath = path.join(__dirname, '..', 'gcs-key.json')
let serviceAccount = null

try {
  const keyContent = fs.readFileSync(keyPath, 'utf8')
  serviceAccount = JSON.parse(keyContent)
  // Note: avoid printing service account details in logs. Keep logs generic and non-sensitive.
  console.log('[GCS] Service account key loaded (client_email hidden)')
} catch (err) {
  console.warn('[GCS] Warning: Service account key not found at', keyPath)
  console.warn('[GCS] Please place gcs-key.json in backend/ folder for GCS uploads to work')
}

// Get OAuth2 token for GCS authentication
async function getAccessToken () {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  if (!serviceAccount) {
    throw new Error('Service account key not configured')
  }

  return new Promise((resolve, reject) => {
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: serviceAccount.token_uri,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }

    // Simple base64url encode
    const base64url = (str) => Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    
    // Sign JWT using crypto
    const sign = crypto.createSign('RSA-SHA256')
    
    const message = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload))
    sign.update(message)
    const signature = base64url(sign.sign(serviceAccount.private_key))
    const jwt = message + '.' + signature

    // Exchange JWT for access token
    const tokenPayload = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`

    const tokenOptions = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenPayload)
      }
    }

    const tokenReq = https.request(tokenOptions, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          cachedToken = parsed.access_token
          tokenExpiry = Date.now() + (parsed.expires_in - 60) * 1000 // Refresh 60s before expiry
          resolve(cachedToken)
        } catch (err) {
          reject(new Error(`Failed to parse token response: ${data}`))
        }
      })
    })

    tokenReq.on('error', reject)
    tokenReq.write(tokenPayload)
    tokenReq.end()
  })
}

// Upload file to GCS
export async function uploadFileToGCS (bucketName, fileName, fileBuffer, contentType = 'application/octet-stream') {
  if (!serviceAccount) {
    throw new Error('GCS not configured. Place gcs-key.json in backend/ folder.')
  }

  const token = await getAccessToken()
  
  return new Promise((resolve, reject) => {
    const uploadPath = `/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`
    
    const options = {
      hostname: 'www.googleapis.com',
      path: uploadPath,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data)
            resolve({
              name: parsed.name,
              bucket: parsed.bucket,
              url: `https://storage.googleapis.com/${bucketName}/${fileName}`
            })
          } catch (err) {
            resolve({ name: fileName, bucket: bucketName, url: `https://storage.googleapis.com/${bucketName}/${fileName}` })
          }
        } else {
          reject(new Error(`GCS upload failed: ${res.statusCode} ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(fileBuffer)
    req.end()
  })
}

// Download file from GCS
export async function downloadFileFromGCS (bucketName, fileName) {
  const token = await getAccessToken()
  
  return new Promise((resolve, reject) => {
    const downloadPath = `/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`
    
    const options = {
      hostname: 'www.googleapis.com',
      path: downloadPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        const chunks = []
        res.on('data', chunk => { chunks.push(chunk) })
        res.on('end', () => {
          resolve(Buffer.concat(chunks))
        })
      } else {
        reject(new Error(`GCS download failed: ${res.statusCode}`))
      }
    })

    req.on('error', reject)
    req.end()
  })
}

// Generate signed URL for direct download
export async function getSignedUrlForFile (bucketName, fileName, expirationMinutes = 60) {
  if (!serviceAccount) {
    throw new Error('GCS not configured')
  }

  const token = await getAccessToken()
  const expiration = Math.floor(Date.now() / 1000) + (expirationMinutes * 60)

  return new Promise((resolve, reject) => {
    const signPath = `/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}/signedUrl?expiration=${expiration}`
    
    const options = {
      hostname: 'www.googleapis.com',
      path: signPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(parsed.signedUrl || `https://storage.googleapis.com/${bucketName}/${fileName}`)
        } catch (err) {
          // Fallback to public URL
          resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`)
        }
      })
    })

    req.on('error', (err) => {
      // Fallback to public URL if signing fails
      console.warn('[GCS] Signed URL generation failed, using public URL:', err.message)
      resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`)
    })
    req.end()
  })
}

export default {
  uploadFileToGCS,
  downloadFileFromGCS,
  getSignedUrlForFile
}
