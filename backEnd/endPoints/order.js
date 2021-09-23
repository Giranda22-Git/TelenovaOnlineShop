const router = require('express').Router()
const axios = require('axios')

const mongoOrders = require('../models/Orders.js').mongoOrders
const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoCategoryList = require('../models/CategoryList.js').mongoCategoryList
const mongoPromoCode = require('../models/PromoCode.js').mongoPromoCode
const mountedData = require('../staticData/mountedData.js').data
// -590406217
const bot = require('../botCommands/bot_connect.js')



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
  let sale = 0

  console.log(data.promoCode)
  if (data.promoCode) {
    const tmpPromoCode = await mongoPromoCode.findOne({ code: data.promoCode }).lean().exec()
    if (tmpPromoCode) {
      sale = tmpPromoCode.sale
      console.log('promoCode: ', sale)
    }
  }

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
    finishPrice: finishPrice - (finishPrice * (sale / 100)),
    comment: data.comment ? data.comment : '',
    credit: data.credit ? data.credit : false,
    iin: data.iin ? data.iin : '',
    bank: data.bank ? data.bank : '',
    creditMonth: data.creditMonth ? data.creditMonth : 0
  })

  const result = await newOrder.save()

  const tgMessage = `
Имя: ${data.name}
Номер телефона: ${data.phoneNumber}
Итоговая цена: ${finishPrice - (finishPrice * (sale / 100))}
Адрес: ${data.address}
Ссылка на товар: ${mountedData.adminFrontUrl + result._id}
  `

  bot.telegram.sendMessage('-590406217', tgMessage)

  // let Query = `https://telenova.bitrix24.kz/rest/51/atlvkfldeh2wezg0/crm.lead.add.json?FIELDS[TITLE]=Заказ из инетернет магазина&FIELDS[NAME]=${data.name}&FIELDS[PHONE][0][VALUE]=${data.phoneNumber}&FIELDS[OPPORTUNITY]=${result.finishPrice}&FIELDS[PHONE][0][VALUE_TYPE]=WORK&FIELDS[ADDRESS]=${data.address}&FIELDS[COMMENTS]=${mountedData.adminFrontUrl + result._id}`

  // Query = encodeURI(Query)
  // console.log(Query)

  // await axios.get(Query)
  //   .then(response => {
  //     console.log(response.data)
  //   })
  //   .catch(err => {
  //     console.log(err)
  //   })

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
      "kaspi_id": "100098506",
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


// begin paybox webhook

router.post('/paybox', async (req, res) => {
  const data = req.body
  data.MyDataObj = JSON.parse(data.MyDataObj)
  data.pg_result = Boolean(Number(data.pg_result))

  if (data.pg_result) {
    await mongoOrders.updateOne({ _id: data.MyDataObj.id }, { paymentStatus: 'paid', payBoxData: data }).lean().exec()
  }
  res.sendStatus(200)
})

// end paybox webhook


// begin delete all orders
router.delete('/deleteAllOrders', async (req, res) => {
  const result = await mongoOrders.deleteMany({}).exec()

  res.json(result)
})
// end delete all orders
bot.launch()

module.exports = router