import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(config);
const db = getFirestore(app);
getDocs(collection(db, 'users')).then(snap => {
  console.log("Success! size:", snap.size);
}).catch(err => {
  console.error("Failed:", err);
});
