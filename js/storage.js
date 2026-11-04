// ==========================================
// STORAGE.JS — Firebase Firestore connection
// ==========================================

import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Firebase DB ko global window se uthayen (jo firebase-config.js ne set kiya tha)
// Thoda wait karte hain taake firebase-config load ho jaye
const waitForDB = setInterval(() => {
  if (window.firebaseDB) {
    clearInterval(waitForDB);
    initStorage(window.firebaseDB);
  }
}, 100);

function initStorage(db) {
  const COLLECTION_NAME = "inventory";

  // 1. Saara data Firebase se load karna
  window.loadInventoryFromFirebase = async function() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const items = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      return items;
    } catch (e) {
      console.error("Error loading inventory: ", e);
      return [];
    }
  };

  // 2. Ek item save karna (agar code pehle se hai toh update, warna naya add)
  window.saveItemToFirebase = async function(item) {
    try {
      // Item code ko document ID bana rahe hain taake duplicate na ho
      const itemRef = doc(db, COLLECTION_NAME, item.code); 
      await setDoc(itemRef, item);
      return true;
    } catch (e) {
      console.error("Error saving item: ", e);
      return false;
    }
  };

  // 3. Ek item delete karna
  window.deleteItemFromFirebase = async function(itemCode) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, itemCode));
      return true;
    } catch (e) {
      console.error("Error deleting item: ", e);
      return false;
    }
  };

  // 4. Saara data ek sath save karna (PDF Import ke waqt kaam ayega)
  window.bulkSaveToFirebase = async function(itemsArray) {
    try {
      let count = 0;
      for (const item of itemsArray) {
        const itemRef = doc(db, COLLECTION_NAME, item.code);
        await setDoc(itemRef, item);
        count++;
      }
      return count;
    } catch (e) {
      console.error("Error bulk saving: ", e);
      return 0;
    }
  };

  // Global flag set karein taake baaki code ko pata chale Firebase ready hai
  window.firebaseReady = true;
  console.log("✅ Storage.js loaded & Firebase connected");
  
  // Custom event fire karein taake app.js ko pata chale ke data load kar le
  window.dispatchEvent(new Event('firebaseReady'));
}
