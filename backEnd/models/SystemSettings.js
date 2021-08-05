const mongoose = require('mongoose')

const system = new mongoose.Schema({
  systemName: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: Boolean,
    default: true
  }
})

const mongoSystemSettings = mongoose.model('systems', system)
module.exports = { mongoSystemSettings }