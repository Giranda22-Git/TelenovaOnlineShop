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
  }
})

const mongoStorage = mongoose.model('storage', good)
module.exports = { mongoStorage }