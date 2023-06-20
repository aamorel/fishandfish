//import TFIDF and Semantic Encoding functions
import {
  cosineSimilarity,
  getWebsiteOrder,
  tfidfCalculation,
  tfidfSegmentation
} from "./tfidfCosine.js";
import { getSemanticSimilarity } from "./univsentencoder.js";
import { storage, getImageUrlFromStorage } from './background';


//import required libraries
const h2p = require("html2plaintext");
const stopWordRemover = require("remove-stopwords");
const posTagger = require("wink-pos-tagger");
const tagger = posTagger();

//store websites that haven't been found in Chrome Storage
const validWebsiteUrls = [];

//store websites & data that have already been found in the Chrome Storage
const websitesAlreadyStored = [];
const lemmatizedTextAlreadyStored = [];
const fullTextAlreadyStored = [];
const totalWordsAlreadyStored = [];
const tensorsAlreadyStored = [];

//stores tf-idf & tensor data for websites not already stored
const newStorageData = {};

/**
 * Gets the current tab if there is currently one open
 * @returns Returns the url for the current tab, or null otherwise
 */
async function getCurrentTab() {
  const queryOptions = { active: true};
  const [tab] = await chrome.tabs.query(queryOptions);
  console.log("Tab: ", tab);
  return tab;
}

/**
 * Gets text in between html tags using html2plaintext library
 * @param {String} html all of the html from the current page
 * @returns text from the website
 */
function htmlToText(html) {
  return h2p(html);
}

/**
 * Accesses specific website's html code and returns front-facing text
 * @param {String} websiteURL url of the website to retrieve text from
 * @returns
 */
async function getWebsiteText(websiteURL) {
  return await fetch(websiteURL)
    .then(async (response) => {
      const data = await response.text();
      return htmlToText(data);
    })
    .catch((error) => {
      return null;
    });
}

/**
 * Iterates through user's bookmark folders/websites and appends each website to the allBookmarks folder
 * @param {List<Objects>} bookmarks a folder of bookmarks, or actual bookmarks
 * @returns a list of strings containing all the bookmark urls
 */
function processBookmark(bookmarks) {
  let allBookmarks = []; // stores all user bookmark websites
  for (let i = 0; i < bookmarks.length; i++) {
    const bookmark = bookmarks[i];
    if (bookmark.url) {
      allBookmarks.push(bookmark.url);
    }
    if (bookmark.children) {
      allBookmarks = allBookmarks.concat(processBookmark(bookmark.children, 1));
    }
  }
  return allBookmarks;
}

async function setUserBookmarks(allBookmarks) {
  var curUser = await getCurUser();
  if (
    curUser != null &&
    curUser.data != null &&
    "userEmail" in curUser.data &&
    curUser.data["userEmail"] != ""
  ) {
    sendMessageToBackground({
      type: "setUserBookmarks",
      bookmarks: { bookmarks: allBookmarks },
      email: curUser.data["userEmail"]
    });
  }
}

/**
 * Deletes extra spaces and reduces string to contain only letters
 * @param {List<String>} bookmarkedTexts the uncleaned texts of the bookmarked websites
 * @returns cleaned bookmark texts
 */
async function tokenizeText(bookmarkedTexts) {
  const doneTokenizeText = [];
  for (let i = 0; i < bookmarkedTexts.length; i++) {
    doneTokenizeText.push(bookmarkedTexts[i].replace(/[^a-zA-Z0-9 ]/g, " "));
    doneTokenizeText[i] = doneTokenizeText[i].replace(/\s+/g, " ");
    doneTokenizeText[i] = doneTokenizeText[i].toLowerCase();
  }
  return doneTokenizeText;
}

/**
 * Waits until the bookmarks have been retrieved by the browser.
 * If the website data has been cached, get that data and store it in global variables.
 * Otherwise, get the list of text from websites.
 * @returns List of Strings containing the uncleaned texts from websites that haven't been cached
 */
async function fetchBookMarkText(
  allFriendBookmarkData = "curUser",
  bookmarkToName = "curUser"
) {
  // gets the bookmarks from the Chromium browser
  const bookmarks = await new Promise((resolve) => {
    chrome.bookmarks.getTree(resolve);
  });
  // gets websites out of the bookmarks
  const websiteUrls = processBookmark(bookmarks);
  await setUserBookmarks(websiteUrls);
  // gets the text of each of the bookmarked websites
  const websiteTexts = [];
  const unusableWebsites = [];
  const names = {};
  for (let i = 0; i < websiteUrls.length; i++) {
    //check if the data for the website is already stored in firebase
    var websiteData = await checkStorage(websiteUrls[i]);
    if (
      websiteData != null &&
      websiteData["data"] != null &&
      websiteData["data"]["tensors"] != null
    ) {
      websiteData = websiteData["data"];
      //retrieve data if stored locally
      websitesAlreadyStored.push(websiteUrls[i]);
      lemmatizedTextAlreadyStored.push(websiteData["lemmatizedText"]);
      fullTextAlreadyStored.push(websiteData["fullText"]);
      totalWordsAlreadyStored.push(websiteData["totalWords"]);
      tensorsAlreadyStored.push(JSON.parse(websiteData["tensors"]));
      names[websiteUrls[i]] = [await getCurUser()];
    } else {
      //get the website texts if not already stored locally
      websiteData = await getWebsiteText(websiteUrls[i]);
      if (websiteData != null) {
        websiteTexts.push(websiteData);
        validWebsiteUrls.push(websiteUrls[i]);
      } else {
        unusableWebsites.push(websiteUrls[i]);
      }
    }
  }
  if (allFriendBookmarkData != "curUser") {
    for (var bookmark in allFriendBookmarkData) {
      if (!websitesAlreadyStored.includes(bookmark)) {
        websitesAlreadyStored.push(bookmark);
        lemmatizedTextAlreadyStored.push(
          allFriendBookmarkData[bookmark]["lemmatizedText"]
        );
        fullTextAlreadyStored.push(allFriendBookmarkData[bookmark]["fullText"]);
        totalWordsAlreadyStored.push(
          allFriendBookmarkData[bookmark]["totalWords"]
        );
        tensorsAlreadyStored.push(
          JSON.parse(allFriendBookmarkData[bookmark]["tensors"])
        );
        names[bookmark] = [bookmarkToName[bookmark]];
      } else {
        names[bookmark].push(bookmarkToName[bookmark]);
      }
    }
  }
  return [websiteTexts, names];
}

/**
 * Returns text of the current website if the url is valid (not null) and there is text on the page
 * @returns the text of the current website if the website is valid
 */
async function checkCurrentTab() {
  const result = await getCurrentTab();
  if (!result) {
    return null;
  }

  const tab = result.url;
  if (!tab) {
    return null;
  }
  validWebsiteUrls.push(tab);

  return await getWebsiteText(tab);
}

/**
 * Removes the stop-words (words that don't provide significant meaning) and empty strings/spaces from each of the texts
 * @param {List<String>} bookmarkTexts contains uncleaned text
 * @returns List<List<String>> containing meaningful strings from the texts
 */
function removeStopWords(bookmarkTexts) {
  const retBookmarkTexts = [];
  for (let i = 0; i < bookmarkTexts.length; i++) {
    retBookmarkTexts.push(
      stopWordRemover.removeStopwords(bookmarkTexts[i].split(" "))
    );
  }
  for (let i = 0; i < bookmarkTexts.length; i++) {
    retBookmarkTexts[i].filter((val) => val !== "" && val != " ");
  }
  return retBookmarkTexts;
}

/**
 * Gets the base form of each of the words in the bookmarked texts for easy comparison
 * @param {List<List<String>>} meaningfulWords bookmarked text containing meaningful (stop word removed) strings
 * @returns List<List<String>> with all words in their base form
 */
function lemmatizeText(meaningfulWords) {
  const lemmatizedTexts = [];
  for (let i = 0; i < meaningfulWords.length; i++) {
    lemmatizedTexts.push([]);
    const lemmatized = tagger.tagRawTokens(meaningfulWords[i]);
    for (let j = 0; j < lemmatized.length; j++) {
      if (lemmatized[j].hasOwnProperty("lemma")) {
        lemmatizedTexts[i].push(lemmatized[j]["lemma"]);
      } else {
        lemmatizedTexts[i].push(meaningfulWords[i][j]);
      }
    }
  }
  return lemmatizedTexts;
}

/**
 * Sends a dictionary to the background file containing data.
 * Expects a response in some cases.
 * @param {Dictionary} message the dictionary containing all the data
 * @returns a promise indicating whether the action was performed successfully or not
 */
async function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Check in Chrome Storage to see if the website url has already been tokenized
 * @param {*} websiteUrl - the url of the website that needs to be checked in chrome storage
 * @returns null if the website is not present,
 */
async function checkStorage(websiteUrl) {
  try {
    const response = await sendMessageToBackground({
      type: "getWebsiteData",
      websiteUrl: websiteUrl
    });
    return response;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function getCurUser() {
  try {
    const response = await sendMessageToBackground({
      type: "getCurUser"
    });
    return response;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function getUserBookmarks(userEmail) {
  try {
    const response = await sendMessageToBackground({
      type: "getUserBookmarks",
      userEmail: userEmail
    });
    return response;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

/**
 * Function to set storage data for a certain website
 * @param {String} websiteUrl the website url under which you're storing data
 * @param {Dictionary} data the data that you want to store for that website url
 */
async function setStorage(websiteUrl, data) {
  chrome.runtime.sendMessage({
    type: "setStorage",
    websiteUrl: websiteUrl,
    data: data
  });
  return true;
}

function setUserEmailLocal() {
  chrome.runtime.sendMessage({
    type: "setUserEmailLocal"
  });
}

/**
 *
 * @param {Dictionary} dict
 * @param {String} key
 * @param {Any} defaultValue
 * @returns
 */
function getOrDefault(dict, key, defaultValue) {
  if (key in dict) {
    return dict[key];
  } else {
    return defaultValue;
  }
}

/**
 * Performs all tf-idf calculations on bookmarked texts
 * @param {List<String>} bookmarkTexts full texts from each of the bookmarked websites
 * @returns the tf-idf calculated values with the similarities of each of the websites
 */
async function getTfidf(bookmarkTexts) {
  const tokenizedText = await tokenizeText(bookmarkTexts);
  const meaningfulWords = removeStopWords(tokenizedText);
  const totalWordsByDoc = [];
  for (var i = 0; i < meaningfulWords.length; i++)
    totalWordsByDoc.push(meaningfulWords[i].length);
  const lemmatizedTexts = lemmatizeText(meaningfulWords);
  for (let i = 0; i < lemmatizedTexts.length; i++) {
    var data = {
      fullText: bookmarkTexts[i],
      tokenizedText: tokenizedText[i],
      meaningfulWords: meaningfulWords[i],
      totalWords: totalWordsByDoc[i],
      lemmatizedText: lemmatizedTexts[i]
    };
    newStorageData[validWebsiteUrls[i]] = data;
    // setStorage(validWebsiteUrls[i], data);
  }
  const initialTfidf = tfidfSegmentation(
    lemmatizedTexts.concat(lemmatizedTextAlreadyStored)
  );
  const completedTfidf = tfidfCalculation(
    initialTfidf[0],
    initialTfidf[1],
    initialTfidf[2],
    totalWordsByDoc.concat(totalWordsAlreadyStored)
  );
  return cosineSimilarity(completedTfidf);
}

async function try_login(email, password) {
  try {
    const response = await sendMessageToBackground({
      type: "login",
      email: email,
      password: password
    });
    return response.data;
  } catch {
    console.log("Login Error");
    return "Login Error";
  }
}

async function try_create_account(name, email, password) {
  try {
    const response = await sendMessageToBackground({
      type: "create_account",
      name: name,
      email: email,
      password: password
    });
    return response.data;
  } catch {
    console.log("Login Error");
    return "Login Error";
  }
}

/*
Main function
*/
async function main() {
  //check if the current tab is null
  const firstTabText = await checkCurrentTab();
  if (firstTabText == null) {
    return;
  }

  //get friend bookmarks
  var response = await getCurUser();
  response = response.data["userEmail"];
  var friendEmails = await getUserFriends("getFriends", response);
  var allFriendBookmarkData = {};
  var bookmarkToName = {};
  for (let i = 0; i < friendEmails.length; i++) {
    var userBookmarks = await getUserBookmarks(friendEmails[i]);
    if (userBookmarks != null && userBookmarks["data"] != null) {
      userBookmarks = userBookmarks["data"]["bookmarks"];
      for (var bookmark in userBookmarks) {
        if (!allFriendBookmarkData.hasOwnProperty(userBookmarks[bookmark])) {
          var curBookmarkData = await checkStorage(userBookmarks[bookmark]);
          if (curBookmarkData != null && curBookmarkData["data"]) {
            allFriendBookmarkData[userBookmarks[bookmark]] =
              curBookmarkData["data"];
            bookmarkToName[userBookmarks[bookmark]] = [friendEmails[i]];
          }
        } else {
          bookmarkToName[userBookmarks[bookmark]].push(friendEmails[i]);
        }
      }
      console.log(bookmarkToName);
    }
  }

  //get full text for each of the bookmarks & add the text of the first website
  const bookmarkTextsAndMappingsToEmail = await fetchBookMarkText(
    allFriendBookmarkData,
    bookmarkToName
  );
  const bookmarkTexts = bookmarkTextsAndMappingsToEmail[0];
  const bookmarkToEmail = bookmarkTextsAndMappingsToEmail[1];
  bookmarkTexts.unshift(firstTabText);

  //TF-IDF
  const cosineSims = await getTfidf(bookmarkTexts);
  //Semantic Encoding
  const semanticEncodingValues = await getSemanticSimilarity(
    bookmarkTexts,
    tensorsAlreadyStored
  );
  for (let i = 1; i < validWebsiteUrls.length; i++) {
    newStorageData[validWebsiteUrls[i]]["tensors"] =
      semanticEncodingValues[0][i - 1];
    await setStorage(validWebsiteUrls[i], newStorageData[validWebsiteUrls[i]]);
    // var websiteData = await checkStorage(validWebsiteUrls[i]);
  }

  //Get the order of websites from TF-IDF & Semantic Encoding
  const orderedWebsitesTfidf = getWebsiteOrder(
    validWebsiteUrls.concat(websitesAlreadyStored),
    cosineSims
  );
  const orderedWebsitesSemanticEncoding = getWebsiteOrder(
    validWebsiteUrls.concat(websitesAlreadyStored),
    semanticEncodingValues[1]
  );
  return [orderedWebsitesTfidf, orderedWebsitesSemanticEncoding, bookmarkToEmail];
}

async function friendRequest(type, userEmail, friendEmail) {
  sendMessageToBackground({
    type: type,
    userEmail: userEmail,
    friendEmail: friendEmail
  });
}

async function getUserFriends(type, userEmail) {
  const response = await sendMessageToBackground({
    type: type,
    userEmail: userEmail
  });
  return response.data;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + "&hellip;" : str;
}



exports.main = main;
exports.tokenizeText = tokenizeText;
exports.setStorage = setStorage;
exports.try_login = try_login;
exports.try_create_account = try_create_account;
exports.checkStorage = checkStorage;
exports.getCurUser = getCurUser;
exports.setUserEmailLocal = setUserEmailLocal;
exports.getUserFriends = getUserFriends;
exports.friendRequest = friendRequest;
exports.truncate = truncate;
exports.storage = storage;
exports.getImageUrlFromStorage = getImageUrlFromStorage;
