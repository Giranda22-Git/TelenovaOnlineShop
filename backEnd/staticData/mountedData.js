const data = {
  mongoUrl: 'mongodb://localhost:27017/TelenovaOnlineShop',
	serverUrl: 'http://localhost:3001/',
  interiorServerUrl: 'https://textforeva.ru/',
  adminFrontUrl: 'http://82.146.62.154:8000/apps/invoice/preview/',
	PORT: 3001
}
// https://textforeva.ru/
const mongoCategoryTree = require('../models/CategoryTree.js').mongoCategoryTree
const mongoStorage = require('../models/Storage.js').mongoStorage
const fs = require('fs')
const tmpDir = __dirname + '/../endPoints/promoActionsImages/'

async function mountedCreateNewCategoryTree () {
  const forGenerateNewCategoryTree = await mongoCategoryTree.find({ trigger: 'current' }).exec()
  if (forGenerateNewCategoryTree.length !== 1) {
    const newTree = new mongoCategoryTree({})
    await newTree.save()
  }
}

const worker = require('node-schedule')
const mongoPromoCode = require('../models/PromoCode.js').mongoPromoCode

async function restartPromoCodeWorkers () {
  promoCodes = await mongoPromoCode.find().lean().exec()

  for (const promoCode of promoCodes) {
    const tmpDate = new Date(promoCode.date)
    if (tmpDate > new Date()) {
      worker.scheduleJob(String(promoCode._id), tmpDate, async (y) => {
        console.log(y)
        const tmp = await mongoPromoCode.deleteOne({ _id: promoCode._id }).exec()
        console.log(tmp)
      })
      console.log('promoCode worker reactivated')
    } else {
      await mongoPromoCode.deleteOne({ _id: promoCode._id }).exec()
    }
  }
}
const mongoPromoAction = require('../models/PromoAction.js').mongoPromoAction

async function deletePromoAction (id) {
  const targetPromoAction = await mongoPromoAction.findById(id).lean().exec()

  for (const file of targetPromoAction.promoImages) {
    delBadFile(file.fileName)
  }

  await mongoPromoAction.deleteOne({ _id: id }).exec()
}

function delBadFile(fileName) {
  fs.unlinkSync(tmpDir + fileName)
}

const promoActionMiddleware = require('./supFunctions.js').promoActionMiddleware

async function restartPromoActionWorkers () {
  const promoActions = await mongoPromoAction.find().lean().exec()

  for (const promoAction of promoActions) {
    if (promoAction.productKaspiId.length > 1) {
      if (new Date(promoAction.timeOfPromoEnding) > new Date()) {
        worker.scheduleJob(String(promoAction._id), new Date(promoAction.timeOfPromoEnding), async (y) => {
          console.log(y)

          await promoActionMiddleware(promoAction._id, -1, false)

          deletePromoAction(promoAction._id)
        })
        console.log('promo action worker has been reactivated')
      } else {

        await promoActionMiddleware(promoAction._id, -1, false)

        deletePromoAction(promoAction._id)
        console.log('promo action worker has been deleted')
      }
    }
    else if (data.typeOfPromo === 1 || data.typeOfPromo === 5) {
      if (new Date(promoAction.timeOfPromoEnding) > new Date()) {
        worker.scheduleJob(String(promoAction._id), new Date(promoAction.timeOfPromoEnding), async (y) => {
          console.log(y)

          await mongoPromoAction.deleteOne({ _id: promoAction._id })
        })
      } else {
        await mongoPromoAction.deleteOne({ _id: promoAction._id })
      }
    }
    else if (promoAction.categoryName.length > 1) {
      if (new Date(promoAction.timeOfPromoEnding) > new Date()) {
        worker.scheduleJob(String(promoAction._id), new Date(promoAction.timeOfPromoEnding), async (y) => {
          console.log(y)
          await promoActionMiddleware(promoAction._id, -1, true)

          deletePromoAction(promoAction._id)
        })
        console.log('promo action worker has been reactivated')
      } else {

        await promoActionMiddleware(promoAction._id, -1, true)

        deletePromoAction(promoAction._id)

        console.log('promo action worker has been deleted')
      }
    }
  }
}

module.exports = {data, mountedCreateNewCategoryTree, restartPromoCodeWorkers, restartPromoActionWorkers}