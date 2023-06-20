//FIREBASE

import { initializeApp } from "firebase/app"
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword
} from "firebase/auth"
//setDoc with specified id & addDoc with randomlyGenerated id
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from "firebase/firestore"


const firebaseConfig = {
  apiKey: "AIzaSyBZehVBqTVMDAdTImRFV3yuASY5nPuq1YE",
  authDomain: "information-curation-330d8.firebaseapp.com",
  databaseURL: "https://information-curation-330d8-default-rtdb.firebaseio.com",
  projectId: "information-curation-330d8",
  storageBucket: "information-curation-330d8.appspot.com",
  messagingSenderId: "941528853862",
  appId: "1:941528853862:web:84ca8ef7dc8b2e7c37aca7",
  measurementId: "G-VDSM7QK2LY"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)
export const storage = getStorage(app)
var curUser = null


async function setFirebaseWebsiteData(website, data) {
  const docRef = doc(db, "websites", encodeURIComponent(website))
  await setDoc(docRef, data)
}

async function setFirebaseUserBookmarkData(userEmail, data) {
  const docRef = doc(db, "userBookmarks", userEmail)
  await setDoc(docRef, data)
}

async function getUserBookmarks(curUserEmail) {
  console.log(curUserEmail)
  const docRef = doc(db, "userBookmarks", curUserEmail)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return docSnap.data()
  } else {
    return null
  }
}

async function getFirebaseWebsiteData(website) {
  const docRef = doc(db, "websites", encodeURIComponent(website))
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return docSnap.data()
  } else {
    return null
  }
}

async function getFriends(userEmail) {
  var ref = await getDocs(
    collection(db, "friends", userEmail, "approvedFriends")
  )
  if (ref != null && ref !== undefined) {
    var allFriends = []
    ref.forEach((doc) => {
      allFriends.push(doc.id)
    })
    return allFriends
  }
  return null
  // const docRef = doc(db, "friends", userEmail);
  // const docSnap = await getDoc(docRef);
  // if (docSnap.exists()) {
  //     return docSnap.data();
  // } else {
  //     return null;
  // }
}

async function getFriendRequests(userEmail) {
  var ref = await getDocs(
    collection(db, "friendRequests", userEmail, "allRequests")
  )
  if (ref != null && ref !== undefined) {
    var allFriends = []
    ref.forEach((doc) => {
      allFriends.push(doc.id)
    })
    return allFriends
  }
  return null

  // const docRef = doc(db, "friendRequests", userEmail);
  // const docSnap = await getDoc(docRef);
  // if (docSnap.exists()) {
  //     return docSnap.data();
  // } else {
  //     return null;
  // }
}

async function acceptFriendRequest(userEmail, friendEmail) {
  const docRef = doc(
    db,
    "friendRequests",
    userEmail,
    "allRequests",
    friendEmail
  )
  await deleteDoc(docRef)
  const docRef2 = doc(db, "friends", userEmail, "approvedFriends", friendEmail)
  await setDoc(docRef2, { approved: true })
  const docRef3 = doc(db, "friends", friendEmail, "approvedFriends", userEmail)
  await setDoc(docRef3, { approved: true })
}

async function declineFriendRequest(userEmail, friendEmail) {
  const docRef = doc(
    db,
    "friendRequests",
    userEmail,
    "allRequests",
    friendEmail
  )
  await deleteDoc(docRef)
}

async function makeFriendRequest(userEmail, friendEmail) {
  const docRef = doc(
    db,
    "friendRequests",
    friendEmail,
    "allRequests",
    userEmail
  )
  await setDoc(docRef, { approved: false })
}

//set storage locally in the chrome browser
async function setUser(userEmail) {
  await chrome.storage.local.set(
    { ["curUser"]: { userEmail: userEmail } },
    function () {}
  )
}

//get the current user, stored locally in the chrome browser
async function getCurUserData() {
  return await chrome.storage.local.get(["curUser"]).then((result) => {
    if (result["curUser"] === undefined) {
      return null
    }
    return result["curUser"]
  })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message["type"] === "getWebsiteData") {
    getFirebaseWebsiteData(message["websiteUrl"]).then((responseData) => {
      sendResponse({ type: "responseData", data: responseData })
    })
  } else if (message["type"] === "getUserBookmarks") {
    getUserBookmarks(message["userEmail"]).then((responseData) => {
      sendResponse({ type: "responseData", data: responseData })
    })
  } else if (message["type"] === "getCurUser") {
    getCurUserData().then((responseData) => {
      sendResponse({ type: "responseData", data: responseData })
    })
  } else if (message["type"] === "getUserFriends") {
    getFriends(message.email).then((responseData) => {
      sendResponse({ type: "responseData", data: responseData })
    })
  } else if (message["type"] === "setUserEmailLocal") {
    setUser("")
    // setFirebaseStorage()
  } else if (message["type"] === "setStorage") {
    setFirebaseWebsiteData(message.websiteUrl, message.data)
  } else if (message["type"] === "setUserBookmarks") {
    setFirebaseUserBookmarkData(message.email, message.bookmarks)
    // setFirebaseStorage()
  } else if (message["type"] === "login") {
    signIn(message.email, message.password).then((responseData) => {
      sendResponse({ type: "responseData", data: responseData })
    })
  } else if (message["type"] === "create_account") {
    createAccount(message.name, message.email, message.password).then(
      (responseData) => {
        sendResponse({ type: "responseData", data: responseData })
      }
    )
  } else if (message["type"] === "acceptFriendRequest") {
    acceptFriendRequest(message.userEmail, message.friendEmail)
  } else if (message["type"] === "declineFriendRequest") {
    declineFriendRequest(message.userEmail, message.friendEmail)
  } else if (message["type"] === "makeFriendRequest") {
    makeFriendRequest(message.userEmail, message.friendEmail)
  } else if (message["type"] === "getFriends") {
    getFriends(message.userEmail).then((responseData) => {
      sendResponse({ type: "responseData", data: responseData })
    })
  } else if (message["type"] === "getFriendRequests") {
    getFriendRequests(message.userEmail).then((responseData) => {
      sendResponse({ type: "responseData", data: responseData })
    })
  }
  return true
})

async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in
      const user = userCredential.user
      curUser = user
      setUser(curUser.email)
      return curUser.email
    })
    .catch((error) => {
      const errorMessage = error.message
      if (errorMessage === "Firebase: Error (auth/invalid-email).") {
        return "Invalid Email"
      } else if (errorMessage === "Firebase: Error (auth/wrong-password).") {
        return "Wrong Password"
      } else if (errorMessage === "Firebase: Error (auth/user-not-found).") {
        return "Email Not Found"
      }
      return "Invalid Email or Password."
    })
}

async function createAccount(name, email, password) {
  console.log(email)
  console.log(password)
  return createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in
      const user = userCredential.user
      curUser = user
      setUser(curUser.email)
      console.log(curUser.email)
      return curUser.email
    })
    .catch((error) => {
      const errorMessage = error.message
      if (errorMessage === "Firebase: Error (auth/invalid-email).") {
        return "Invalid Email"
      } else if (errorMessage === "Firebase: Error (auth/wrong-password).") {
        return "Wrong Password"
      } else if (errorMessage === "Firebase: Error (auth/user-not-found).") {
        return "Email Not Found"
      }
      return "Invalid Email or Password."
    })
}

async function getImageUrlFromStorage(imageName){
  const pathReference = ref(storage, 'files/' + imageName + ".jpg")
  return await getDownloadURL(pathReference)
};

exports.getImageUrlFromStorage = getImageUrlFromStorage