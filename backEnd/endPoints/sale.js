const router = require('express').Router()

const mongoSale = require('../models/Sales.js').mongoSale
const mongoStorage = require('../models/Storage.js').mongoStorage


// begin get all sales

router.get('/', async (req, res) => {
  const result = await mongoSale.find().exec()
  res.json(result)
})

// end get all sales




// begin create new sale

router.post('/', async (req, res) => {
  const data = req.body

  const targetProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': data.productKaspiId }, {
    active: true,
    salePrice: true,
    sale: true,
    'offerData.category_list': true,
    'offerData.images': true,
    'offerData.name': true,
    'offerData.price': true,
    'offerData.kaspi_id': true,
    'offerData.kaspi_rating': true
  }).lean().exec()

  if (targetProduct) {
    const isUnique = await mongoSale.findOne({ 'productKaspiIdData.offerData.kaspi_id': data.productKaspiId }).lean().exec()

    if (isUnique) {
      await deleteSale(data.productKaspiId)
    }

    const newSale = mongoSale({
      productKaspiIdData: targetProduct,
      sale: data.sale
    })
    const result = await newSale.save()

    if (result._id) {
      await mongoStorage.updateOne({ 'offerData.kaspi_id': data.productKaspiId }, {
        $inc: { sale: data.sale, salePrice: -(targetProduct.offerData.price * (data.sale / 100)) }
      }).exec()

      const resultProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': data.productKaspiId }, {
        active: true,
        salePrice: true,
        sale: true,
        'offerData.category_list': true,
        'offerData.images': true,
        'offerData.name': true,
        'offerData.price': true,
        'offerData.kaspi_id': true,
        'offerData.kaspi_rating': true
      }).lean().exec()

      res.json(resultProduct)
    } else {
      res.sendStatus(500)
    }
  } else {
    res.status(500).json({ message: 'такого товара не существует' })
  }
})
/*
POST http://localhost:3001/sale/ HTTP/1.1
content-type: application/json

{
  "productKaspiId": "100098508",
  "sale": "30"
}
*/
// end create new sale


// begin delete sale

router.delete('/', async (req, res) => {
  const data = req.body

  await deleteSale(data.productKaspiId)

  res.sendStatus(200)
})
/*
DELETE http://localhost:3001/sale HTTP/1.1
content-type: application/json

{
  "productKaspiId": "100098508"
}
*/
// end delete sale


async function deleteSale (productKaspiId) {
  const targetSale = await mongoSale.findOne({ 'productKaspiIdData.offerData.kaspi_id': productKaspiId }).lean().exec()
  console.log(targetSale)
  const result = await mongoStorage.updateOne(
    { 'offerData.kaspi_id': productKaspiId },
    { $inc: { sale: -targetSale.sale, salePrice: (targetSale.productKaspiIdData.offerData.price * (targetSale.sale / 100)) } }
  )

  if (result.nModified) {
    await mongoSale.deleteOne({ 'productKaspiIdData.offerData.kaspi_id': productKaspiId })
  }
}


module.exports = router