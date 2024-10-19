// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from 'firebase/auth'

const api_Key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: api_Key,
  authDomain: "whatsapp-frontend-sigma.vercel.app.firebaseapp.com",
  projectId: "whatsapp-demonstration",
  storageBucket: "whatsapp-demonstration.appspot.com",
  messagingSenderId: "623110699885",
  appId: "1:623110699885:web:7afdd53d10c513c8f53864", 
  redirectUri: "https://whatsapp-frontend-sigma.vercel.app/__/auth/handler"
};

// Initialize Firebase use ternary to check if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]; 

export const firebaseAuth = getAuth(app)