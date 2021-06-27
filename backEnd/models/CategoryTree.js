const mongoose = require('mongoose')

const tree = new mongoose.Schema({
  trigger: {
    type: String,
    default: 'current'
  },
  tree: {
    type: Object,
    default: {}
  },
  dateOfCreature: {
    type: Date,
    default: new Date()
  }
})

const mongoCategoryTree = mongoose.model('categorytree', tree)
module.exports = { mongoCategoryTree }