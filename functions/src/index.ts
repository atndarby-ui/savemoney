import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();

// Define response type for the analysis
interface AnalysisResponse {
    summary: string;
    advice: string;
    score: number;
}

// 1. Basic Health Check Function
export const helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from SaveMoney Cloud Functions!");
});

// 2. Scheduled Weekly Analysis (Example Trigger)
// Note: Requires Blaze plan (Pay as you go) for scheduled functions and external API calls (Gemini)
export const analyzeWeeklySpending = functions.pubsub.schedule('every monday 09:00').onRun(async (context) => {
    // Logic to query all users, analyze their last weeks transaction, and send a notification
    // For demo purposes, we log it.
    console.log('Running weekly analysis job...');
    return null;
});

// 3. On-Demand Smart Analysis (Callable from App)
export const analyzeFinancialHealth = functions.https.onCall(async (data, context) => {
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
        const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key;

        if (!apiKey) {
            throw new functions.https.HttpsError('internal', 'API Key not configured.');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
        const analysis: AnalysisResponse = JSON.parse(jsonStr);

        return analysis;

    } catch (error) {
        console.error("Analysis error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to analyze data.');
    }
});
