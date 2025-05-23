// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDWBFBB2_FUps2n-qLrVwlvXNivvv0XZns",
  authDomain: "openimpactlab-v2.firebaseapp.com",
  projectId: "openimpactlab-v2",
  storageBucket: "openimpactlab-v2.firebasestorage.app",
  messagingSenderId: "303699872643",
  appId: "1:303699872643:web:9f4f74ada233cef265c4b6",
  measurementId: "G-MD29990PGD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);