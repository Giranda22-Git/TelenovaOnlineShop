const mongoose = require('mongoose')

const order = new mongoose.Schema({
  date: {
    type: Date,
    default: new Date
  },
  address: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  goods: {
    type: [],
    default: []
  },
  name: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'notPaid'],
    default: 'notPaid'
  },
  orderStatus: {
    type: String,
    enum: ['preparedForDelivery', 'sented', 'delivered'],
    default: 'preparedForDelivery'
  },
  cardNumber: {
    type: String,
    default: ''
  },
  finishPrice: {
    type: Number,
    default: 0
  },
  comment: {
    type: String,
    default: ''
  },
  payBoxData: {
    type: Object,
    default: {}
  },
  credit: {
    type: Boolean,
    default: false
  },
  creditMonth: {
    type: Number,
    default: 0
  },
  iin: {
    type: String,
    default: ''
  },
  bank: {
    type: String,
    default: ''
  }
})

const mongoOrders = mongoose.model('orders', order)
module.exports = { mongoOrders }