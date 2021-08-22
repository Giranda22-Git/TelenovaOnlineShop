const router = require('express').Router()
const worker = require('node-schedule')
const multer = require('multer')
const fs = require('fs')

const mongoPromoAction = require('../models/PromoAction.js').mongoPromoAction

const serverData = require('../staticData/mountedData.js').data
const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoCategoryList = require('../models/CategoryList.js').mongoCategoryList

const promoActionMiddleware = require('../staticData/supFunctions.js').promoActionMiddleware

const tmpDir = __dirname + '/promoActionsImages/'
const upload = multer({ dest: __dirname + '/promoActionsImages/', limits: { fileSize: 15000000 } })


// begin get all promoActions

router.get('/', async (req, res) => {
  const result = await mongoPromoAction.find().lean().exec()
  res.json(result)
})
/*
GET http://localhost:3001/promoAction/ HTTP/1.1
content-type: application/json
*/
// end get all promoActions


// begin get image

router.get('/download/:filename', (req, res) => {
  res.sendFile(tmpDir + req.params.filename)
})

// end get image


// begin create new promoAction

router.post('/', upload.any(), async (req, res) => {
  const data = req.body
  const files = req.files
  console.log(data)
  let filesDeletedFlag = false

  let result = null

  if (new Date(data.timeOfPromoEnding) > new Date()) {
    if (data.productKaspiId) {
      const targetProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': data.productKaspiId }).lean().exec()
      const isUniquePromoAction = await mongoPromoAction.findOne({ productKaspiId: data.productKaspiId }).lean().exec()
      console.log(Boolean(targetProduct), Boolean(files), Boolean(!isUniquePromoAction))
      if (targetProduct && files && !isUniquePromoAction) {
        const promoImages = filesValidation(files, targetProduct.offerData.kaspi_name)

        result = mongoPromoAction({
          typeOfPromo: data.typeOfPromo,
          productKaspiId: data.productKaspiId,
          productKaspiIdData: targetProduct,
          name: data.name ? data.name : '',
          bigPromoText: data.bigPromoText ? data.bigPromoText : '',
          smallPromoText: data.smallPromoText ? data.smallPromoText : '',
          timeOfPromoEnding: new Date(data.timeOfPromoEnding),
          sale: data.sale,
          productImages: targetProduct.offerData.images,
          oldPrice: targetProduct.offerData.price,
          newPrice: targetProduct.offerData.price - (targetProduct.offerData.price * (data.sale / 100)),
          promoImages
        })
      } else {
        for (const file of files) {
          delBadFile(file.filename)
        }
        filesDeletedFlag = true
      }
    }
    else if (data.categoryName) {
      const targetCategory = await mongoCategoryList.findOne({ name: data.categoryName }).lean().exec()
      const isUniquePromoAction = await mongoPromoAction.findOne({ categoryName: data.categoryName }).lean().exec()
      console.log(Boolean(targetCategory), Boolean(files), Boolean(!isUniquePromoAction))
      if (targetCategory && files && !isUniquePromoAction) {
        const categoryProducts = await mongoStorage.find({ 'offerData.category_list': { $in: [data.categoryName] } }, { 'offerData.price': true }).lean().exec()

        categoryProducts.sort((a, b) => a.offerData.price - b.offerData.price)

        const promoImages = filesValidation(files, targetCategory.name)

        result = mongoPromoAction({
          typeOfPromo: data.typeOfPromo,
          categoryName: data.categoryName,
          name: data.name ? data.name : '',
          bigPromoText: data.bigPromoText ? data.bigPromoText : '',
          smallPromoText: data.smallPromoText ? data.smallPromoText : '',
          timeOfPromoEnding: new Date(data.timeOfPromoEnding),
          sale: data.sale,
          categoryImage: targetCategory.image,
          minPrice: categoryProducts[0].offerData.price - (categoryProducts[0].offerData.price * (data.sale / 100)),
          promoImages
        })
      } else {
        for (const file of files) {
          delBadFile(file.filename)
        }
        filesDeletedFlag = true
      }
    }
  }

  if (!result) {
    if (!filesDeletedFlag) {
      for (const file of files) {
        delBadFile(file.filename)
      }
    }
    filesDeletedFlag = true
    res.sendStatus(500)
  } else {
    let answer = await result.save()
    if (data.productKaspiId) {

      await promoActionMiddleware(answer._id, 1, false)

      worker.scheduleJob(String(answer._id), new Date(data.timeOfPromoEnding), async (y) => {
        console.log(y)

        await promoActionMiddleware(answer._id, -1, false)

        deletePromoAction(answer._id)
      })
    }
    else if (data.categoryName) {
      const saleProducts = await mongoStorage.find(
        { 'offerData.category_list': { $in: [data.categoryName] } },
        { 'offerData.kaspi_id': true, 'offerData.price': true, _id: false }
      ).lean().exec()

      await mongoPromoAction.updateOne({ _id: answer._id }, { productsSaleArray: saleProducts }).exec()

      await promoActionMiddleware(answer._id, 1, true)

      worker.scheduleJob(String(answer._id), new Date(data.timeOfPromoEnding), async (y) => {
        console.log(y)
        await promoActionMiddleware(answer._id, -1, true)

        deletePromoAction(answer._id)
      })
    }

    res.json(answer)
  }
})
/*
POST http://localhost:3001/promoAction/ HTTP/1.1
content-type: application/json

{
  "typeOfPromo": 1,
  "sale": 20,
  "categoryName": "Фото- и видеокамеры",
  "bigPromoText": "sdaasdalkdmaks",
  "timeOfPromoEnding": "2021-08-21T22:01:20.021Z"
}
*/
// end create new promoAction


// begin get promoAction by id

router.get('/id/:id', async (req, res) => {
  let result = await mongoPromoAction.findById(req.params.id).lean().exec()

  result = deleteEmptyFields(result)

  res.json(result)
})

// end get promoAction by id


// begin get promoActions by typeOfPromo

router.get('/typeOfPromo/:typeOfPromo', async (req, res) => {
  let result = await mongoPromoAction.find({ typeOfPromo: req.params.typeOfPromo }).lean().exec()

  for (let index = 0; index < result.length; index++) {
    result[index] = deleteEmptyFields(result[index])
  }

  res.json(result)
})

// end get promoActions by typeOfPromo


// begin delete promoAction by id

router.delete('/', async (req, res) => {
  const data = req.body

  const targetPromoAction = await mongoPromoAction.findById(data.id).lean().exec()

  if (targetPromoAction) {
    if (targetPromoAction.productKaspiId) {
      const targetJob = worker.scheduledJobs[String(targetPromoAction._id)]

      if (targetJob) {
        targetJob.cancel()
      }

      await promoActionMiddleware(targetPromoAction._id, -1, false)

      deletePromoAction(targetPromoAction._id)
    }
    else if (targetPromoAction.categoryName) {
      const targetJob = worker.scheduledJobs[String(targetPromoAction._id)]

      if (targetJob) {
        targetJob.cancel()
      }

      await promoActionMiddleware(targetPromoAction._id, -1, true)

      deletePromoAction(targetPromoAction._id)
    }

    res.sendStatus(200)
  } else {
    res.sendStatus(500)
  }
})
/*
DELETE http://localhost:3001/promoAction/ HTTP/1.1
content-type: application/json

{
  "id": "612183e57ac5db85d51d0bf8"
}
*/

// end delete promoAction by id


function delBadFile(fileName) {
  fs.unlinkSync(tmpDir + fileName)
}

function filesValidation (files, name) {
  let images = []
  let index = 0
  files.forEach(file => {

    const validTypes = ['svg+xml', 'png', 'gif', 'jpeg', 'jpg']

    const fileType = file.mimetype.split('/')

    if (file.size > 10000000 || fileType[0] !== 'image' || !validTypes.includes(fileType[1])) {
      delBadFile(file.filename)
      console.log('bad file')
      return false
    }
    else {
      const newFileName = name + index++ + `.${fileType[1]}`
      fs.renameSync(tmpDir + file.filename, tmpDir + newFileName)

      image = {
        clientPath: `${serverData.interiorServerUrl}promoAction/download/${newFileName}`,
        fileName: newFileName
      }
      images.push(image)
    }
  })
  return images
}

async function deletePromoAction (id) {
  const targetPromoAction = await mongoPromoAction.findById(id).lean().exec()

  for (const file of targetPromoAction.promoImages) {
    delBadFile(file.fileName)
  }

  await mongoPromoAction.deleteOne({ _id: id }).exec()
}

function deleteEmptyFields(document) {
  for (const key in document) {
    if (document[key] == 0) {
      delete document[key]
    }
    else if (typeof document[key] === 'object') {
      if (Object.keys(document[key]).length === 0)
        delete document[key]
    }
  }

  return document
}


module.exports = router
