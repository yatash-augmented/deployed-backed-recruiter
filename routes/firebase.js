const firebase = require('firebase-admin')

// Use environment variables for Firebase configuration
const serviceAccount = {
  type: process.env.type || "service_account",
  project_id: process.env.project_id || "smart-talent-66df6",
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key?.replace(/\\n/g, '\n'),
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri || "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.token_uri || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url || "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.client_x509_cert_url,
  universe_domain: process.env.universe_domain || "googleapis.com"
}

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount)
})

module.exports = {firebase}