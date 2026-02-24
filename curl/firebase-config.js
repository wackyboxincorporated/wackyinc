
const firebaseConfig = {
    apiKey: "AIzaSyBPQ-LlVHPDGueiPS8DKTg4SH5qQW87RxE",
    authDomain: "datahandlering.firebaseapp.com",
    projectId: "datahandlering",
    storageBucket: "datahandlering.firebasestorage.app",
    messagingSenderId: "415085138953",
    appId: "1:415085138953:web:68eba14aae6ba60d80d4d8",
    measurementId: "G-YJL7V0CF4G"
};

// Inase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
