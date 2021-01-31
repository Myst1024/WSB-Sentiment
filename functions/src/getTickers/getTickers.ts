import * as functions from "firebase-functions";

import axios, { AxiosResponse } from "axios";
const admin = require("firebase-admin");
const firebase = require("firebase-admin");

try {
  admin.initializeApp();
} catch (e) {}
const db = admin.firestore();

exports.getTickers = functions.https.onRequest(async (request, response) => {
  const tickers = await getNewTickers();
  await submitTickers(tickers);
  response.send("done");
});

const getNewTickers = async () => {
  const tickerUrl: string = "https://www.alphavantage.co/query";
  const tickerParams = {
    function: "LISTING_STATUS",
    apikey: functions.config().alphavantage.key,
  };
  const result = await axios.get(tickerUrl, { params: tickerParams });
  return result.status === 200 ? parseAlphavantageResult(result) : [];
};

const parseAlphavantageResult = (result: AxiosResponse) => {
  let tickers: Array<string> = [];
  const rows = result.data.split("\r\n");
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ticker = row.substring(0, row.indexOf(","));
    // Filtering out subsets ex: ACIC-WS
    if (!ticker.includes("-")) {
      tickers.push(ticker);
    }
  }
  console.log(tickers);
  return tickers;
};

const submitTickers = async (tickers: Array<string>) => {
  const timestamp = firebase.firestore.Timestamp.now()._seconds;

  await db.collection("tickers").doc("main").set({ list: tickers, timestamp });

  return;
};
