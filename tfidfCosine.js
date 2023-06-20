const math = require("mathjs");

/**
 * Finds the total frequencies of each word for each document,
 * gets all the words across the documents,
 * and finds in which documents each word is found
 * @param {List<List<String>>} lemmatizedTexts a list of list of the base roots of the words in the bookmark texts
 * @returns a List containing a Set of all words across all documents, a dictionary containing dictionaries of words and their frequencies in each bookmark text, and a dictionary containing the number of words in each document
 */
function tfidfSegmentation(lemmatizedTexts) {
  const allWords = new Set();
  const wordFrequenciesByDoc = {};
  const whereFound = {};
  for (let i = 0; i < lemmatizedTexts.length; i++) {
    const curDoc = {}; // stores the words found in that specific document and their frequency
    for (let j = 0; j < lemmatizedTexts[i].length; j++) {
      // if the word isn't already found in the document, add it
      if (!curDoc.hasOwnProperty(lemmatizedTexts[i][j])) {
        curDoc[lemmatizedTexts[i][j]] = 0;
        if (!whereFound.hasOwnProperty(lemmatizedTexts[i][j]))
          whereFound[lemmatizedTexts[i][j]] = [];
        whereFound[lemmatizedTexts[i][j]].push(i);
      }
      curDoc[lemmatizedTexts[i][j]] += 1;
      allWords.add(lemmatizedTexts[i][j]);
    }
    wordFrequenciesByDoc[i] = curDoc;
  }
  return [allWords, wordFrequenciesByDoc, whereFound];
}

/**
 * Returns a 2-D array containing the tfidf values for each word within each document
 * @param {} allWords contains all the words across documents
 * @param {*} wordFrequenciesByDoc dictionary containing dictionaries of words and their frequencies in each doc
 * @param {*} whereFound dictionary containing the words as keys and the number of documents it appeared in
 * @param {*} numWordsPerDoc list containing the total number of words in each of the documents
 * @returns the tfidf values for each of the documents
 */
function tfidfCalculation(
  allWords,
  wordFrequenciesByDoc,
  whereFound,
  numWordsPerDoc
) {
  const allTfidfMappings = [];
  const numDocuments = Object.keys(wordFrequenciesByDoc).length;
  for (let i = 0; i < numDocuments; i++) {
    allTfidfMappings[i] = [];
  }
  // iterate through each of the words, and calculate the tf/idf values for each
  for (let word of allWords) {
    const numDocumentsFoundIn = whereFound[word].length;
    // idf is the total number of documents divided by the number of documents that the word is found in
    const idf = Math.log(Number(numDocuments) / numDocumentsFoundIn);
    // tf is the ratio of frequency of the word to the total number of words in the specific document
    for (let documentNum = 0; documentNum < numDocuments; documentNum++) {
      let frequency;
      if (wordFrequenciesByDoc[documentNum].hasOwnProperty(word)) {
        frequency = wordFrequenciesByDoc[documentNum][word];
      } else {
        frequency = 0;
      }
      const tf = frequency / Number(numWordsPerDoc[documentNum]);
      allTfidfMappings[documentNum].push(tf * idf);
    }
  }
  return allTfidfMappings;
}

/**
 * Finds the cosine similarity values between current user website and bookmarks
 * @param {Dictionary} tfidfMappings contains the tfidf values for each of the bookmarked websites
 * @returns the cosine similarities between the bookmarked websites and the current tab website
 */
function cosineSimilarity(tfidfMappings) {
  const cosineSim = [];
  for (let i = 1; i < tfidfMappings.length; i++) {
    const numerator = math.dot(tfidfMappings[0], tfidfMappings[i]);
    const denom1 = math.sqrt(
      math.sum(tfidfMappings[0].map((x) => Math.pow(x, 2)))
    );
    const denom2 = math.sqrt(
      math.sum(tfidfMappings[i].map((x) => Math.pow(x, 2)))
    );
    if (denom1 == 0 || denom2 == 0) {
      cosineSim.push(1);
    } else {
      cosineSim.push(numerator / Number(denom1 * denom2));
    }
  }
  return cosineSim;
}

/**
 * Sorts the bookmarked websites from most similar to least similar to the current website
 * @param {List<String>} websites the current tab and bookmarked websites
 * @param {List<Double>} cosineSimilarities the similarities from the first bookmark website to the last
 * @returns List containing a length 2 list with the websites and their corresponding cosine similarities from highest to lowest similarity
 */
function getWebsiteOrder(websites, cosineSimilarities) {
  const pairings = [];
  for (let i = 1; i < websites.length; i++) {
    pairings.push([websites[i], cosineSimilarities[i - 1]]);
  }
  pairings.sort((a, b) => a[1] - b[1]);
  return pairings.reverse();
}

//Export all functions for use in other files and in testing
export {
  tfidfSegmentation,
  tfidfCalculation,
  cosineSimilarity,
  getWebsiteOrder
};
