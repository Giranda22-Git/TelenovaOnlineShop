const mongoose = require('mongoose')

const promoCode = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  sale: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
})

const mongoPromoCode = mongoose.model('promoCodes', promoCode)
module.exports = { mongoPromoCode }