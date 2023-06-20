const tf = require("@tensorflow/tfjs");
const modelUrl = require("@tensorflow-models/universal-sentence-encoder");

/**
 * Main Function for getting the semantic similarity of the texts with the current website
 * @param {List<String>} sentences The lists of texts from each of the bookmarks
 * @returns the semantic encoded similarities of the current website text and the bookmarked websites
 */
async function getSemanticSimilarity(sentences, tensorsAlreadyStored) {
  for (let i = 0; i < tensorsAlreadyStored.length; i++) {
    tensorsAlreadyStored[i] = tf.tensor(tensorsAlreadyStored[i]);
  }
  return modelUrl.load().then(async (model) => {
    const embeddings = await model.embed(sentences);
    const splitTensors = await splitTensor(embeddings);
    const docSimilarities = await allCosineSimilarities(
      splitTensors.concat(tensorsAlreadyStored)
    );
    return [await serializeTensors(splitTensors), docSimilarities];
  });
}

/**
 * Splits the 2-D Tensor into 1-D tensors
 * @param {2-D Tensor} allTensors a (BookmarkedWebsites + 1).length by 512 length tensor containing tensors for each website
 * @returns array of 1-D tensors representing each of the websites
 */
async function splitTensor(allTensors) {
  const individualTensors = [];
  for (var i = 0; i < allTensors.shape[0]; i++) {
    individualTensors.push(allTensors.slice([i, 0], [1, allTensors.shape[1]]));
  }
  return individualTensors;
}

/**
 * Creates list of all of the cosine similarities between the current website and bookmarked websites
 * @param {Array of 1-D Tensors} allTensors List containing tensors of current website and bookmarked websites
 * @returns Array of cosine similarities between current website and each bookmarked website
 */
async function allCosineSimilarities(allTensors) {
  if (allTensors.length == 0) return null;
  const similaritiesByDoc = [];
  for (let i = 1; i < allTensors.length; i++) {
    similaritiesByDoc.push(
      await tensorCosineSimilarity(allTensors[0], allTensors[i])
    );
  }
  return similaritiesByDoc;
}

/**
 * Gets the cosine similarity between two tensors of 512-length (representing texts from two different websites)
 * @param {1-D Tensor} tensor1 512-length tensor from current tab website
 * @param {1-D Tensor} tensor2 512-length tensor from one bookmarked website
 * @returns cosine similarity of the two tensors
 */
async function tensorCosineSimilarity(tensor1, tensor2) {
  const dotProduct = tensor1.dot(tensor2.transpose()).dataSync()[0];
  const t1Norm = Math.sqrt(tensor1.square().sum().dataSync()[0]);
  const t2Norm = Math.sqrt(tensor2.square().sum().dataSync()[0]);
  return dotProduct / (t1Norm * t2Norm);
}

async function serializeTensors(listTensors) {
  for (let i = 0; i < listTensors.length; i++) {
    listTensors[i] = await listTensors[i].array();
    listTensors[i] = JSON.stringify(listTensors[i]);
  }
  return listTensors;
}

export { getSemanticSimilarity };
