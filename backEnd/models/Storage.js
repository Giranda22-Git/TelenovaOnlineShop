const mongoose = require('mongoose')

const good = new mongoose.Schema({
  offerData: {
    type: Object,
    required: true
  },
  dateOfCreature: {
    type: Date,
    default: new Date()
  },
  active: {
    type: Boolean,
    default: true
  },
  inStock: {
    type: Boolean,
    default: true
  },
  countOfSold: {
    type: Number,
    default: 0
  },
  similarProductsId: {
    type: [String],
    default: []
  },
  similarProducts: {
    type: [],
    default: []
  },
  sale: {
    type: Number,
    default: 0
  }
})

const mongoStorage = mongoose.model('storage', good)
module.exports = { mongoStorage }