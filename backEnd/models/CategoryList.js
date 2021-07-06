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
    default: { clientPath: 'https://resources.workable.com/wp-content/uploads/2016/01/category-manager-640x230.jpg' }
  }
})

const mongoCategoryList = mongoose.model('categorylist', list)
module.exports = { mongoCategoryList }