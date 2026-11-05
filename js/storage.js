// ==========================================
// STORAGE.JS — Firebase Connection & Save
// ==========================================

import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const waitForDB = setInterval(() => {
  if (window.firebaseDB) {
    clearInterval(waitForDB);
    initStorage(window.firebaseDB);
  }
}, 100);

function initStorage(db) {
  const COLLECTION_NAME = "inventory";

  // 1. Load Data
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

  // 2. Save Single Item
  window.saveItemToFirebase = async function(item) {
    try {
      const itemRef = doc(db, COLLECTION_NAME, item.code); 
      await setDoc(itemRef, item);
      return true;
    } catch (e) {
      console.error("Error saving item: ", e);
      return false;
    }
  };

  // 3. Delete Single Item
  window.deleteItemFromFirebase = async function(itemCode) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, itemCode));
      return true;
    } catch (e) {
      console.error("Error deleting item: ", e);
      return false;
    }
  };

  // 4. Bulk Save (PDF/Excel Import ke liye)
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
      throw e;
    }
  };

  window.firebaseReady = true;
  console.log("✅ Storage.js loaded & Firebase connected");
  
  // Custom event fire karein
  window.dispatchEvent(new Event('firebaseReady'));
}
