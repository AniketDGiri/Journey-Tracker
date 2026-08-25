import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Paste your Firebase project config here.
// Firebase console → Project settings → Your apps → SDK setup → Config
const firebaseConfig = {
  apiKey:            'AIzaSyDHchHCT1mzmAxyYMGlNYac3uLB0aRWoKg',
  authDomain:        'journey-tracker-9778a.firebaseapp.com',
  projectId:         'journey-tracker-9778a',
  storageBucket:     'journey-tracker-9778a.firebasestorage.app',
  messagingSenderId: '302867636205',
  appId:             '1:302867636205:web:6c99fd01e44085b0f811e4',
}

const app = initializeApp(firebaseConfig)

export const db             = getFirestore(app)
export const auth           = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
