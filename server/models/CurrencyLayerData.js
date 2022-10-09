const mongoose = require("mongoose");

const CurrencyLayerDataSchemea = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
});

const CurrencyData = mongoose.model("CurrencyData", CurrencyLayerDataSchemea);
module.exports = CurrencyData;
