
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCuwE0es_iDSNGKU3mRN6_EtU92z1Rnlcc",
    authDomain: "ketoansieucap-854b4.firebaseapp.com",
    projectId: "ketoansieucap-854b4",
    storageBucket: "ketoansieucap-854b4.firebasestorage.app",
    messagingSenderId: "598128426891",
    appId: "1:598128426891:web:64f797d1a348e36711798e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
// @ts-ignore - getReactNativePersistence is available in the React Native bundle but may not show in default types
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);
// const analytics = getAnalytics(app);
