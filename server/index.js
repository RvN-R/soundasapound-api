const express = require("express");
const mongoose = require("mongoose");
const { TwitterApi } = require("twitter-api-v2");
const cors = require("cors");
const app = express();
const CronJob = require("cron").CronJob;
const CurrencyLayerModel = require("./models/CurrencyLayerData");
const PORT = process.env.PORT;

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

app.use(express.json());
app.use(cors());

require("dotenv").config();

const MONGO_URL = process.env.MONGO_URL;
const CURRENCY_LAYER_CALL = process.env.CURRENCY_LAYER_CALL;

const TWITTER_APP_KEY = process.env.TWITTER_APP_KEY;
const TWITTER_APP_SECRET = process.env.TWITTER_APP_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

const client = new TwitterApi({
  appKey: `${TWITTER_APP_KEY}`,
  appSecret: `${TWITTER_APP_SECRET}`,
  accessToken: `${TWITTER_ACCESS_TOKEN}`,
  accessSecret: `${TWITTER_ACCESS_SECRET}`,
});

const rwClient = client.readWrite;

mongoose.connect(`${MONGO_URL}`, {
  useNewUrlParser: true,
});

let todaysDate = "";

async function getCurrencyLayerResponse() {
  const url =
    "https://api.apilayer.com/currency_data/live?source=USD&currencies=GBP";
  const requestOptions = {
    method: "GET",
    headers: {
      apikey: `${CURRENCY_LAYER_CALL}`,
    },
    redirect: "follow",
  };
  fetch(url, requestOptions)
    .then((res) => res.json())
    .catch((err) => console.error("error" + err));

  try {
    let response = await fetch(url, requestOptions);
    response = await response.json();
    let GBP = response.quotes.USDGBP;
    return GBP;
  } catch (err) {
    console.log(err);
  }
}

async function getTodaysDate() {
  const date = new Date();
  year = date.getFullYear();
  month = date.getMonth();
  day = date.getUTCDate();
  time = date.toLocaleTimeString();
  todaysDate = `${year}-${month}-${day}-${time}`;
  return todaysDate;
}

async function postToMongo() {
  const value = await getCurrencyLayerResponse();
  const date = await getTodaysDate();

  const currencyData = new CurrencyLayerModel({
    value: value,
    date: date,
  });

  try {
    await currencyData.save();
    console.log("Data Saved");
  } catch (err) {
    console.log(err);
  }
}

// postToMongo();

const tweet = async () => {
  const value = await getCurrencyLayerResponse();
  const ukPound = String.fromCodePoint(0x00a3);
  const usDollar = String.fromCodePoint(0x0024);
  const text = `1 United States Dollar = ${value} Pound Sterling ${usDollar} vs ${ukPound} #soundasapound #gbp #poundcrisis #sterlingcrisis`;
  try {
    await rwClient.v2.tweet({
      text: text,
    });
    console.log(text);
    console.log("Success!!");
  } catch (err) {
    console.log(err);
  }
};

// tweet();

const job = new CronJob("0 08 * * *", () => {
  postToMongo();
  console.log("postToMongoExicuted morning job");
  tweet();
  console.log("tweet just executed morning job");
});

const job2 = new CronJob("0 17 * * *", () => {
  postToMongo();
  console.log("postToMongoExicuted evening job");
  tweet();
  console.log("tweet just executed evening job");
});

job.start();
job2.start();

app.get("/", async (req, res) => {
  CurrencyLayerModel.find({}, (err, result) => {
    if (err) {
      res.send(err);
    }
    res.send(result);
  });
});

app.listen(PORT, () => {
  console.log("Server is running on port 3001");
});
