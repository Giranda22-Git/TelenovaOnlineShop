const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')

const serverData = require('./staticData/mountedData.js').data
const mountedCreateNewCategoryTree = require('./staticData/mountedData.js').mountedCreateNewCategoryTree
const mountedReactivatePromoCodeWorkers = require('./staticData/mountedData.js').restartPromoCodeWorkers
const mountedRestartPromoActionWorkers = require('./staticData/mountedData.js').restartPromoActionWorkers
mountedCreateNewCategoryTree()
mountedReactivatePromoCodeWorkers()
mountedRestartPromoActionWorkers()

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use((req, res, next) => {
	res.contentType('application/json')
	next()
})
app.use(cors())

init(serverData)

async function init(serverData) {
	await mongoose.connect(serverData.mongoUrl, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	})

	mongoose.connection.once('open', () => {
		app.listen(serverData.PORT, '0.0.0.0', (err) => {
			if (err) return new Error(`error in starting server, error: ${err}`)
			else console.log(`server started on \nPORT: ${serverData.PORT}\nURL: ${serverData.serverUrl}`)
		})

		app.use('/storage', require('./endPoints/storage.js'))
		app.use('/categoryTree', require('./endPoints/tree.js'))
		app.use('/order', require('./endPoints/order.js'))
    app.use('/promoCode', require('./endPoints/promoCode.js'))
    app.use('/promoAction', require('./endPoints/promoAction.js'))
    app.use('/systemSetting', require('./endPoints/systemSettings.js'))
    app.use('/sale', require('./endPoints/sale.js'))
	})
	mongoose.connection.emit('open')
}