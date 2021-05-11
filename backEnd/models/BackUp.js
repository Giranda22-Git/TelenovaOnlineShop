const mongoose = require('mongoose')

const backUp = new mongoose.Schema({
    trigger: {
        type: String,
        default: 'current'
    },
    allData: {
        type: Object,
        required: true
    },
    dateOfCreature: {
        type: Date,
        default: new Date()
    }
})

const mongoBackUp = mongoose.model('backUp', backUp)
module.exports = { mongoBackUp }