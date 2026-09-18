import { adminDb } from './server/firebase-admin.js';
adminDb.collection('users').get().then(snap => {
  console.log("Success! Users count:", snap.size);
}).catch(err => {
  console.error("Error connecting to Firestore:", err);
});
