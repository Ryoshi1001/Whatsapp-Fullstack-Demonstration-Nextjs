// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from 'firebase/auth'

const api_Key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: api_Key,
  authDomain: "whatsapp-demonstration.firebaseapp.com",
  projectId: "whatsapp-demonstration",
  storageBucket: "whatsapp-demonstration.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase use ternary to check if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]; 

export const firebaseAuth = getAuth(app)