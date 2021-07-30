const router = require('express').Router()
const worker = require('node-schedule')

const mongoPromoCode = require('../models/PromoCode.js').mongoPromoCode


// begin get all promoCodes

router.get('/', async (req, res) => {
  const result = await mongoPromoCode.find().lean().exec()
  res.json(result)
})
/*
GET http://localhost:3001/promoCode/ HTTP/1.1
content-type: application/json
*/
// end get all promoCodes


// begin create new promoCode

router.post('/', async (req, res) => {
  const data = req.body

  const date = new Date(data.date)
  if (date < new Date()) res.json({ err: 'указанная дата меньше текущей' })
  else {
    if (!data.code) {
      data.code = promoCodeGen(15)
    }

    const newPromoCode = new mongoPromoCode({
      date: date,
      code: data.code,
      sale: Number(data.sale)
    })
    const result = await newPromoCode.save()

    if (result._id) {
      worker.scheduleJob(date, async (y) => {
        console.log(y)
        const tmp = await mongoPromoCode.deleteOne({ _id: result._id }).exec()
        console.log(tmp)
      })
    }

    res.json(result)
  }
})
/*
POST http://localhost:3001/promoCode/ HTTP/1.1
content-type: application/json

{
  "date": "2021-07-24T09:23:34.240Z",
  "sale": 20
}
*/
// end create new promoCode


// begin delete promoCode

router.delete('/', async (req, res) => {
  const data = req.body
  console.log(data)
  const result = await mongoPromoCode.deleteOne({ _id: data.id }).exec()
  res.json(result)
})

// end delete promoCode


// begin switch sale

router.post('/switchSale', async (req, res) => {
  const data = req.body

  await mongoPromoCode.updateOne({ _id: data.id }, { sale: data.sale }).exec()
  res.sendStatus(200)
})

// end switch sale


// begin delete all promoCodes
router.delete('/deleteAllPromoCodes', async (req, res) => {
  const result = await mongoPromoCode.deleteMany({}).exec()

  res.json(result)
})
// end delete all promoCodes


function promoCodeGen(length) {
  var result = ''
  var words = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'
  var max_position = words.length - 1
  for (i = 0; i < length; ++i) {
    position = Math.floor(Math.random() * max_position)
    result = result + words.substring(position, position + 1)
  }
  return result
}


module.exports = router