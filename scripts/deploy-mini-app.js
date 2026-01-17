const fs = require('fs');
const path = require('path');
// NOTE: This script assumes you have firebase-admin initialized or are using a client SDK to call the function. 
// For simplicity in a local dev environment, we can use the Firebase Client SDK to call the callable function.

// INSTRUCTIONS:
// 1. Install dependencies: npm install firebase dotenv
// 2. Run: node scripts/deploy-mini-app.js <path-to-html-file> "<Title>" "<Icon>" "<Description>"

const { initializeApp } = require("firebase/app");
const { getFunctions, httpsCallable } = require("firebase/functions");
require('dotenv').config();

// CONFIGURATION
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY, // Reuse existing key if possible or set a new one
    authDomain: "ketoansieucap-854b4.firebaseapp.com",
    projectId: "ketoansieucap-854b4",
};

// Main
async function deploy() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node scripts/deploy-mini-app.js <html-file-path> <title> [icon] [description]");
        return;
    }

    const [filePath, title, icon = '🎮', description = ''] = args;

    try {
        console.log(`Reading file: ${filePath}`);
        const htmlContent = fs.readFileSync(path.resolve(filePath), 'utf8');

        console.log("Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const functions = getFunctions(app);
        const registerMiniApp = httpsCallable(functions, 'registerMiniApp');

        console.log("Uploading...");
        const result = await registerMiniApp({
            title,
            icon,
            description,
            htmlContent // Sending raw HTML
        });

        console.log("Success! App ID:", result.data.id);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

deploy();
