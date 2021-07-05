const mongoose = require('mongoose')

const list = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    default: ''
  },
  level: {
    type: Number,
    default: ''
  },
  countOfSold: {
    type: Number,
    default: 0
  },
  image: {
    type: Object,
    default: {}
  }
})

const mongoCategoryList = mongoose.model('categorylist', list)
module.exports = { mongoCategoryList }