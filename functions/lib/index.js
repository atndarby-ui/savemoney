"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMiniApp = exports.analyzeFinancialHealth = exports.analyzeWeeklySpending = exports.helloWorld = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
// 1. Basic Health Check Function
exports.helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from SaveMoney Cloud Functions!");
});
// 2. Scheduled Weekly Analysis (Example Trigger)
// Note: Requires Blaze plan (Pay as you go) for scheduled functions and external API calls (Gemini)
exports.analyzeWeeklySpending = functions.pubsub.schedule('every monday 09:00').onRun(async (context) => {
    // Logic to query all users, analyze their last weeks transaction, and send a notification
    // For demo purposes, we log it.
    console.log('Running weekly analysis job...');
    return null;
});
// 3. On-Demand Smart Analysis (Callable from App)
exports.analyzeFinancialHealth = functions.https.onCall(async (data, context) => {
    var _a;
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.');
    }
    const { transactions, currency = 'VND' } = data;
    if (!transactions || !Array.isArray(transactions)) {
        throw new functions.https.HttpsError('invalid-argument', 'Transactions data is missing or invalid.');
    }
    try {
        // Init Gemini
        // IMPORTANT: You need to set this environment variable in Firebase Functions config
        // firebase functions:config:set gemini.key="YOUR_API_KEY"
        const apiKey = process.env.GEMINI_API_KEY || ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key);
        if (!apiKey) {
            throw new functions.https.HttpsError('internal', 'API Key not configured.');
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const prompt = `
            Analyze the following financial transactions for a user (Currency: ${currency}):
            ${JSON.stringify(transactions.slice(0, 50))} 
            
            Please provide a JSON response with:
            - summary: A brief summary of spending habits.
            - advice: 1 concrete tip to save money.
            - score: A financial health score from 1-10.
            
            Respond in JSON only.
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);
        return analysis;
    }
    catch (error) {
        console.error("Analysis error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to analyze data.');
    }
});
// 4. Register Mini App (Callable for deploying new tools)
exports.registerMiniApp = functions.https.onCall(async (data, context) => {
    // Optional: Check if user is admin or authenticated
    // if (!context.auth) ...
    var _a;
    const { title, icon, description, url, htmlContent } = data;
    if (!title) {
        throw new functions.https.HttpsError('invalid-argument', 'Title is required');
    }
    if (!url && !htmlContent) {
        throw new functions.https.HttpsError('invalid-argument', 'Either URL or HTML Content is required');
    }
    try {
        const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const appRef = admin.firestore().collection('mini_apps').doc(slug);
        const appData = {
            title,
            icon: icon || '🎮',
            description: description || '',
            url: url || null,
            htmlContent: htmlContent || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Use set with merge to update if exists or create if not
        await appRef.set(appData, { merge: true });
        // If it's a new document, add createdAt
        const doc = await appRef.get();
        if (!((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.createdAt)) {
            await appRef.update({ createdAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        return { success: true, id: slug };
    }
    catch (error) {
        console.error("Error registering mini app:", error);
        throw new functions.https.HttpsError('internal', 'Failed to register mini app');
    }
});
//# sourceMappingURL=index.js.map