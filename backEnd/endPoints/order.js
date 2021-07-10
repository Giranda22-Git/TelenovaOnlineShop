const router = require('express').Router()

const mongoOrders = require('../models/Orders.js').mongoOrders
const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoCategoryList = require('../models/CategoryList.js').mongoCategoryList


// begin get all orders

router.get('/', async (req, res) => {
  const result = await mongoOrders.find().exec()
  res.json(result)
})

// end get all orders


// begin create new order

router.post('/', async (req, res) => {
  const data = req.body

  const goods = []

  for (const product of data.goods) {
    const targetProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': product.kaspi_id }).exec()
    const tmp = {
      product: targetProduct,
      count: product.count,
      price: (targetProduct.offerData.price * product.count) - ((targetProduct.offerData.price * product.count) / 100 * targetProduct.sale)
    }
    goods.push(tmp)

    // инкремент продаж продукта
    await mongoStorage.updateOne({ 'offerData.kaspi_id': product.kaspi_id }, { $inc: { countOfSold: product.count } }).exec()

    // инкремент продаж продуктов в категории первого уровня
    await mongoCategoryList.updateOne({ name: targetProduct.offerData.category_list[0] }, { $inc: { countOfSold: product.count } }).exec()

    // инкремент продаж продукта в категории воторого уровня
    await mongoCategoryList.updateOne({ name: targetProduct.offerData.category_list[1] }, { $inc: { countOfSold: product.count } }).exec()

    // инкремент продаж продукта в категории третьего уровня
    await mongoCategoryList.updateOne({ name: targetProduct.offerData.category_list[2] }, { $inc: { countOfSold: product.count } }).exec()
  }

  let finishPrice = 0

  goods.forEach(product => {
    finishPrice += product.price
  })

  const newOrder = new mongoOrders({
    date: new Date(),
    address: data.address,
    phoneNumber: data.phoneNumber,
    email: data.email,
    goods: goods,
    name: data.name,
    paymentMethod: data.paymentMethod,
    cardNumber: data.cardNumber,
    finishPrice: finishPrice
  })
  const result = await newOrder.save()

  res.json(result)
})
/*
POST http://localhost:3001/order/ HTTP/1.1
content-type: application/json

{
  "address": "abay 150/230",
  "phoneNumber": "+7(705)553-99-66",
  "email": "asqw0@bk.ru",
  "goods": [
    {
      "kaspi_id": "100098508",
      "count": 3
    },
    {
      "kaspi_id": "100098507",
      "count": 1
    }
  ],
  "name": "Dimash Kenzhegaliev",
  "paymentMethod": "card",
  "cardNumber": "9999"
}
*/
// end create new order


// begin switch payment status

router.post('/paymentStatus', async (req, res) => {
  const data = req.body

  await mongoOrders.updateOne({ _id: data.id }, { paymentStatus: data.paymentStatus }).exec()
  res.sendStatus(200)
})

// end switch payment status


// begin switch orderStatus

router.post('/orderStatus', async (req, res) => {
  const data = req.body

  await mongoOrders.updateOne({ _id: data.id }, { orderStatus: data.orderStatus }).exec()
  res.sendStatus(200)
})

// end switch orderStatus


// begin delete all orders
router.delete('/deleteAllOrders', async (req, res) => {
  const result = await mongoOrders.deleteMany({}).exec()

  res.json(result)
})
// end delete all orders


module.exports = router