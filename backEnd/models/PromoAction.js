const mongoose = require('mongoose')

const promoAction = new mongoose.Schema({
  typeOfPromo: {
    type: Number,
    required: true
  },
  productKaspiId: {
    type: String,
    default: ''
  },
  categoryName: {
    type: String,
    default: ''
  },
  bigPromoText: {
    type: String,
    default: ''
  },
  smallPromoText: {
    type: String,
    default: ''
  },
  timeOfPromoEnding: {
    type: Date,
    required: true
  },
  promoImages: {
    type: [],
    default: []
  },
  productImages: {
    type: [],
    default: []
  },
  categoryImage: {
    type: {},
    default: {}
  },
  sale: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  oldPrice: {
    type: Number,
    default: 0
  },
  newPrice: {
    type: Number,
    default: 0
  },
  minPrice: {
    type: Number,
    default: 0
  },
  productsSaleArray: {
    type: [],
    default: []
  }
})

const mongoPromoAction = mongoose.model('promoActions', promoAction)
module.exports = { mongoPromoAction }