import * as functions from "firebase-functions";

const admin = require("firebase-admin");

try {
  admin.initializeApp();
} catch (e) {}
const db = admin.firestore();

// Quick and dirty method of adding to the blacklist
//TODO: add deduping, pass newEntries via params

const newEntries = [""];

exports.addToBlacklist = functions.https.onRequest(
  async (request, response) => {
    const snapshot = await db.collection("blacklist").doc("main").get();
    let blacklist = snapshot.data().blacklist;

    const newBlacklist = blacklist.concat(newEntries);
    blacklist.concat();

    await db
      .collection("blacklist")
      .doc("main")
      .set({ blacklist: newBlacklist });

    response.send("done");
  }
);
