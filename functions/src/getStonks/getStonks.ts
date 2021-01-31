import * as functions from "firebase-functions";

import axios, { AxiosResponse } from "axios";
import Post, { PartialPost } from "../interfaces/Post";
const admin = require("firebase-admin");

const firebase = require("firebase-admin");

try {
  admin.initializeApp();
} catch (e) {}
const db = admin.firestore();

exports.getStonks = functions.https.onRequest(async (request, response) => {
  const posts: Array<PartialPost> = await getNewPosts();
  const blacklist: Array<string> = await getBlacklist();
  const tickers: Array<string> = await getTickers();

  const stonks = parsePosts(posts, blacklist, tickers);
  console.log(stonks);
  await submitStonks(stonks);

  response.send("done");
});

const getNewPosts = async () => {
  const subredditUrl: string = "https://www.reddit.com/r/wallstreetbets.json";
  const subredditParams = { sort: "top", t: "day", limit: 100 };
  const result = await axios.get(subredditUrl, { params: subredditParams });
  return result.status === 200 ? parseRedditResult(result.data) : [];
};

const parseRedditResult = (result: AxiosResponse) => {
  const posts: Array<Post> = result.data ? result.data.children : [];
  let formattedPosts: Array<PartialPost> = [];
  if (posts.length > 0) {
    //TODO: filter stickied posts if necessary (top sort may do so inherently)
    //could do so lazily by skipping (posts.length - limit), so long as number of posts in timeframe always exceeds limit
    formattedPosts = posts.map((post: Post) => {
      const data = post.data;
      return {
        id: data.id,
        created_utc: data.created_utc,
        title: data.title,
        ups: data.ups,
      };
    });
  }
  return formattedPosts;
};

const getBlacklist = async () => {
  const snapshot = await db.collection("blacklist").limit(1).get();
  const blacklist = snapshot.docs[0].data().blacklist;
  return blacklist;
};

const getTickers = async () => {
  const snapshot = await db.collection("tickers").doc("main").get();
  const tickers = snapshot.data().list;
  return tickers;
};

const parsePosts = (
  posts: Array<PartialPost>,
  blacklist: Array<string>,
  tickers: Array<string>
) => {
  const stonks = new Map();
  posts.forEach((post) => {
    const upvotes = Math.sqrt(post.ups);
    //TODO: additionally calculate sentiment from title
    const words = post.title ? post.title.split(/\W/) : [];
    const uniqueWords = [...new Set(words)]; // stripping duplicates
    for (let i = 0; i < uniqueWords.length; i++) {
      const word = uniqueWords[i].toUpperCase();
      if (stonks.has(word)) {
        // if we've already registered this stock, add to its upvote total
        stonks.set(word, stonks.get(word) + upvotes);
      } else if (!blacklist.includes(word) && tickers.includes(word)) {
        // make sure the word is not blacklisted and is a valid ticker
        stonks.set(word, upvotes);
        //TODO: possibly divide upvotes by # of found stocks
      }
    }
  });
  return stonks;
};

const submitStonks = async (stonks: Map<string, number>) => {
  const batch = db.batch();
  const timestamp = firebase.firestore.Timestamp.now()._seconds;

  stonks.forEach((value, key) => {
    const newDocRef = db.collection("stonks").doc();
    batch.set(newDocRef, { ticker: key, upvotes: value, timestamp });
  });
  await batch.commit();
  return;
};
