const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");
require('dotenv').config();

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    authDomain: "ketoansieucap-854b4.firebaseapp.com",
    projectId: "ketoansieucap-854b4",
};

async function cleanup() {
    console.log("Initializing Firebase...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    try {
        console.log("Fetching all mini apps...");
        const querySnapshot = await getDocs(collection(db, "mini_apps"));

        console.log(`Found ${querySnapshot.size} documents. Deleting...`);

        const deletePromises = [];
        querySnapshot.forEach((document) => {
            deletePromises.push(deleteDoc(doc(db, "mini_apps", document.id)));
        });

        await Promise.all(deletePromises);
        console.log("Cleanup complete! All mini apps deleted.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

cleanup();
