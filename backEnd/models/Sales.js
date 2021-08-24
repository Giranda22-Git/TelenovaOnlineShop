const mongoose = require('mongoose')

const sale = new mongoose.Schema({
  productKaspiIdData: {
    type: Object,
    required: true
  },
  sale: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  }
})

const mongoSale = mongoose.model('sales', sale)
module.exports = { mongoSale }