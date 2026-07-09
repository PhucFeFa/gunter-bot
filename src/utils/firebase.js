/**
 * utils/firebase.js
 * ============================================================
 * Firebase Admin SDK - Singleton Initializer
 * ============================================================
 * Reads the service account key from the path defined in .env
 * so the key file NEVER needs to be hardcoded or committed.
 * ============================================================
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Check if JSON string is provided in env (For Cloud Deployment like Render/Heroku)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('[FIREBASE] Admin SDK initialized successfully (via JSON ENV).');
        } catch (e) {
            console.error('[FIREBASE] FATAL: Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON env var!');
            process.exit(1);
        }
    }
} else {
    // Fallback to local file for Development
    const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json');

    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`[FIREBASE] FATAL: serviceAccountKey.json not found at: ${serviceAccountPath}`);
        console.error('[FIREBASE] Please download it from Firebase Console > Project Settings > Service Accounts.');
        console.error('[FIREBASE] OR set FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
        process.exit(1);
    }

    if (!admin.apps.length) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('[FIREBASE] Admin SDK initialized successfully (via Local File).');
    }
}

const db = admin.firestore();

module.exports = { admin, db };
