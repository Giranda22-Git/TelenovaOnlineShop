const router = require('express').Router()
const WebSocket = require('ws')
const wsClient = new WebSocket.Server({ port: 1000 })

const wsClients = new Set()

const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoCategoryTree = require('../models/CategoryTree.js').mongoCategoryTree
const mongoCategoryList = require('../models/CategoryList.js').mongoCategoryList
const mongoPromoCode = require('../models/PromoCode.js').mongoPromoCode

const nearNumber = (arr, number) =>
  arr.map(it => {
      const ch = (it >= 0 ? it : -it) + number;
      return {
        base: it,
        result: ch >= 0 ? ch : -ch
      };
    }).sort((a, b) => { return a.result - b.result && a.result > b.result })[0]

async function addFirstLevelCategoryTree(firstCategory) {
  const isExists = await mongoCategoryTree.findOne({ trigger: 'current' })

  if (!isExists.tree.hasOwnProperty(firstCategory)) {
    await mongoCategoryTree.updateOne(
      { trigger: 'current' },
      { $set: { ['tree.' + firstCategory]: new Object() } }
    )
  }
}

async function addSecondLevelCategoryTree(firstCategory, secondCategory) {
  const isExists = await mongoCategoryTree.findOne({ trigger: 'current' })

  if (!(Object.keys(isExists.tree[firstCategory]).includes(secondCategory))) {
    await mongoCategoryTree.updateOne(
      { trigger: 'current' },
      { $set: { [`tree.${firstCategory}.${secondCategory}`]: new Array() } }
    ).exec()
  }
}

async function addThirdLevelCategoryTree(firstCategory, secondCategory, thirdCategory) {
  const isExists = await mongoCategoryTree.findOne({ trigger: 'current' })

  if (!isExists.tree[firstCategory][secondCategory].includes(thirdCategory)) {
    await mongoCategoryTree.updateOne(
      { trigger: 'current' },
      { $push: { [`tree.${firstCategory}.${secondCategory}`]: thirdCategory } }
    ).exec()
  }
}

async function deleteVoidCategoryTree(firstCategory, secondCategory, thirdCategory) {
  let isExists = await mongoCategoryTree.findOne({ trigger: 'current' }).exec()

  const checkExists = await mongoStorage.find({ 'offerData.category_list': { $in: [thirdCategory] } }).exec()

  console.log(firstCategory, secondCategory, thirdCategory)
  if (checkExists.length === 0) {
    console.log('third', thirdCategory)
    isExists.tree[firstCategory][secondCategory].splice(isExists.tree[firstCategory][secondCategory].indexOf(thirdCategory), 1)
    await mongoCategoryTree.updateOne(
      { trigger: 'current' },
      { [`tree.${firstCategory}.${secondCategory}`]: isExists.tree[firstCategory][secondCategory] }
    ).exec()
  }

  isExists = await mongoCategoryTree.findOne({ trigger: 'current' }).exec()
  if (isExists.tree[firstCategory][secondCategory].length === 0) {
    console.log('second', secondCategory)
    await mongoCategoryTree.updateOne(
      { trigger: 'current' },
      { $unset: { [`tree.${firstCategory}.${secondCategory}`]: '' } }
    ).exec()
  }

  isExists = await mongoCategoryTree.findOne({ trigger: 'current' }).exec()
  if (Object.keys(isExists.tree[firstCategory]).length === 0) {
    console.log('first', firstCategory)
    await mongoCategoryTree.updateOne(
      { trigger: 'current' },
      { $unset: { ['tree.' + firstCategory]: '' } }
    ).exec()
  }
}

async function addCategoryList(firstCategory, secondCategory, thirdCategory) {
  const newList = [ firstCategory, secondCategory, thirdCategory ]

  for (const [index, category] of newList.entries()) {
    const isExist = await mongoCategoryList.findOne({ name: category }).exec()

    if (!isExist) {
      const newCategory = mongoCategoryList({
        name: category,
        level: index + 1
      })
      await newCategory.save()
    }
  }
}

function array_compare(a, b) {
  if (a.length != b.length)
    return false

  for (i = 0; i < a.length; i++)
    if (a[i] != b[i])
      return false

  return true
}


// begin get all goods Warning!!!: this is the heavy load end point

router.get('/', async (req, res) => {
  const start = new Date().getTime()
  const result = await mongoStorage.find({ active: true }, {
    active: true,
    salePrice: true,
    sale: true,
    'offerData.category_list': true,
    'offerData.images': true,
    'offerData.name': true,
    'offerData.price': true,
    'offerData.kaspi_id': true,
    'offerData.kaspi_rating': true,
    'offerData.actual_supplier': true
  }).lean().exec()
  const end = new Date().getTime()
  res.status(200).json(result)
  console.log(`SecondWay: ${end - start}ms`)
})

// end get all goods Warning!!!: this is the heavy load end point



// begin get all goods with sale

router.get('/saleGoods', async (req, res) => {
  const result = await mongoStorage.find({ active: true, sale: { $ne: 0 } }, {
    active: true,
    salePrice: true,
    sale: true,
    'offerData.category_list': true,
    'offerData.images': true,
    'offerData.name': true,
    'offerData.price': true,
    'offerData.kaspi_id': true,
    'offerData.kaspi_rating': true,
    'offerData.product_count': true
  }).lean().exec()

  res.json(result)
})

// end get all goods with sale



// begin get goods by active status

router.get('/active/:status', async (req, res) => {
  const result = await mongoStorage.find({ active: req.params.status }, {
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
  res.json(result)
})

// end get goods by active status

// begin add new goods
router.post('/addGoods', async (req, res) => {
  const data = req.body
  console.log(data)
  // добавление всех товаров на склад
  for (const offer of data.offers) {
    const inStock = await mongoStorage.findOne({ 'offerData.kaspi_id': offer.kaspi_id })
    if (inStock) {
      const targetProductTmpData = await mongoStorage.findOne({ 'offerData.kaspi_id': offer.kaspi_id }, { sale: true }).lean().exec()
      await mongoStorage.updateOne({ 'offerData.kaspi_id': offer.kaspi_id }, {
        offerData: offer,
        salePrice: offer.price - (offer.price * (targetProductTmpData.sale / 100))
      })
      if (!array_compare(inStock.offerData.category_list, offer.category_list)) {
        // удаление категорий в случае их изменения
        deleteVoidCategoryTree(inStock.offerData.category_list[0], inStock.offerData.category_list[1], inStock.offerData.category_list[2])
      }
    } else {
      const tmp = new mongoStorage({
        offerData: offer,
        dateOfCreature: new Date(),
        salePrice: offer.price
      })
      await tmp.save()
    }

    // добавление категории первого уровня
    await addFirstLevelCategoryTree(offer.category_list[0])

    // добавление категории второго уровня
    await addSecondLevelCategoryTree(offer.category_list[0], offer.category_list[1])

    // добавление категории третьего уровня
    await addThirdLevelCategoryTree(offer.category_list[0], offer.category_list[1], offer.category_list[2])

    // добавление категорий в лист категорий
    await addCategoryList(offer.category_list[0], offer.category_list[1], offer.category_list[2])
  }

  res.sendStatus(200)
})

/*
TEST:

POST http://localhost:3001/storage/addGoods HTTP/1.1
content-type: application/json
*/
// end add new goods


// begin delete all goods

router.post('/deleteAllGoods', async (req, res) => {
  const allGoods = await mongoStorage.find()

  for (const item of allGoods) {
    await mongoStorage.deleteOne({ 'offerData.kaspi_id': item.offerData.kaspi_id })
    await deleteVoidCategoryTree(item.offerData.category_list[0], item.offerData.category_list[1], item.offerData.category_list[2])
  }
  const categoryTree = await mongoCategoryTree.findOne({ trigger: 'current' }, { tree: true }).lean().exec()
  if (!(await mongoStorage.countDocuments()) && Object.keys(categoryTree.tree).length !== 0) {
    await mongoCategoryTree.updateOne({ trigger: 'current' },
      { tree: new Object() }
    ).exec()
  }

  console.log('all goods succefull deleted')

  res.sendStatus(200)
})
/*
TEST:
POST http://localhost:3001/storage/deleteAllGoods HTTP/1.1
content-type: application/json
*/
// end delete all goods


// begin delete goods by kaspi_id

router.post('/deleteGoods', async (req, res) => {
  const data = req.body

  for (const kaspi_id of data.deleteArray) {
    const tmp = await mongoStorage.findOne({ 'offerData.kaspi_id': kaspi_id })
    await mongoStorage.deleteOne({ 'offerData.kaspi_id': kaspi_id })
    await deleteVoidCategoryTree(tmp.offerData.category_list[0], tmp.offerData.category_list[1], tmp.offerData.category_list[2])
  }

  res.sendStatus(200)
})
/*
TEST:

POST http://localhost:3001/storage/deleteGoods HTTP/1.1
content-type: application/json

{
  "deleteArray": [
    "100098508"
  ]
}
*/
// end delete goods by kaspi_id


// begin get most popular prodcuts

router.get('/mostPopular/products/:count', async (req, res) => {
  const allProducts = await mongoStorage.find({ active: true }, {
    active: true,
    salePrice: true,
    sale: true,
    'offerData.category_list': true,
    'offerData.images': true,
    'offerData.name': true,
    'offerData.price': true,
    'offerData.kaspi_id': true,
    'offerData.kaspi_rating': true,
    'offerData.properties': true,
    'offerData.product_count': true
  }).sort({ 'countOfSold': -1 }).limit(Number(req.params.count)).lean().exec()

  res.json(allProducts)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/products/2 HTTP/1.1
content-type: application/json
*/
// end get most popular prodcuts


// begin get most popular first level categories

router.get('/mostPopular/firstLevelCategories/:count', async (req, res) => {
  const categoryList = await mongoCategoryList.find({ level: 1 }, { __v: false })
  .sort({ 'countOfSold': -1 }).lean().exec()
  const result = []

  for (const category of categoryList) {
    const isExistProduct = await mongoStorage.countDocuments({ 'offerData.category_list': { $in: [category.name] } }).exec()
    if (isExistProduct > 0) {
      result.push(category)
    }
    if (result.length >= req.params.count) {
      break
    }
  }

  res.json(result)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/firstLevelCategories/4 HTTP/1.1
content-type: application/json
*/
// end get most popular first level categories


// begin get most popular second level categories

router.get('/mostPopular/secondLevelCategories/:count', async (req, res) => {
  const start = new Date().getTime()
  let categoryList = await mongoCategoryList.find({ level: 2 }, { __v: false })
  .sort({ 'countOfSold': -1 }).lean().exec()
  const result = []

  for (const category of categoryList) {
    const isExistProduct = await mongoStorage.countDocuments({ 'offerData.category_list': { $in: [category.name] } }).exec()
    if (isExistProduct > 0) {
      result.push(category)
    }
    if (result.length >= req.params.count) {
      break
    }
  }

  res.json(result)
  const end = new Date().getTime()
  console.log(`SecondWay second: ${end - start}ms`)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/secondLevelCategories/4 HTTP/1.1
content-type: application/json
*/
// end get most popular second level categories


// begin get most popular third level categories

router.get('/mostPopular/thirdLevelCategories/:count', async (req, res) => {
  const categoryList = await mongoCategoryList.find({ level: 3 }, { __v: false })
  .sort({ 'countOfSold': -1 }).lean().exec()
  const result = []

  for (const category of categoryList) {
    const isExistProduct = await mongoStorage.countDocuments({ 'offerData.category_list': { $in: [category.name] } }).exec()
    if (isExistProduct > 0) {
      result.push(category)
    }
    if (result.length >= req.params.count) {
      break
    }
  }

  res.json(result)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/thirdLevelCategories/40 HTTP/1.1
content-type: application/json
*/
// end get most popular third level categories


// begin get new products

router.get('/mostPopular/freshProducts/:count', async (req, res) => {
  let allProducts = await mongoStorage.find({ active: true }, {
    active: true,
    salePrice: true,
    sale: true,
    'offerData.category_list': true,
    'offerData.images': true,
    'offerData.name': true,
    'offerData.price': true,
    'offerData.kaspi_id': true,
    'offerData.kaspi_rating': true
  }).sort({ 'dateOfCreature': -1 }).limit(Number(req.params.count)).lean().exec()

  res.json(allProducts)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/freshProducts/4 HTTP/1.1
content-type: application/json
*/
// end get new products


// begin get item by kaspi id
router.get('/kaspi_id/:id', async (req, res) => {
  const targetProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': req.params.id }).lean().exec()
  if (targetProduct) {
    const similarProducts = []

    for (const product of targetProduct.similarProductsId) {
      const tmp = await mongoStorage.findOne({ 'offerData.kaspi_id': product, active: true }).exec()
      similarProducts.push(tmp)
    }
    targetProduct.similarProducts = similarProducts
    res.json(targetProduct)
  } else {
    res.sendStatus(404)
  }
})
// end get item by kaspi id


// begin delete all similar products

router.get('/removeAllSimilarPoducts', async (req, res) => {
  const allProducts = await mongoStorage.find().exec()

  for (const product of allProducts) {
    const result = await mongoStorage.updateOne({ _id: product._id }, { similarProducts: new Array() }).exec()
    console.log(result)
  }

  const resultProducts = await mongoStorage.find().exec()
  res.json(resultProducts)
})

// end delete all similar poducts


// begin update inStock status
router.post('/updateInStock', async (req, res) => {
  const data = req.body

  const result = await mongoStorage.updateOne({ 'offerData.kaspi_id': data.kaspi_id }, { inStock: data.value })

  res.json(result)
})
/*
POST http://localhost:3001/storage/updateInStock HTTP/1.1
content-type: application/json

{
  "kaspi_id": "100098506",
  "value": true
}
*/
// begin update inStock status


// begin update active status
router.post('/updateActive', async (req, res) => {
  const data = req.body

  const result = await mongoStorage.updateOne({ 'offerData.kaspi_id': data.kaspi_id }, { active: data.value })

  res.json(result)
})
/*
POST http://localhost:3001/storage/updateActive HTTP/1.1
content-type: application/json

{
  "kaspi_id": "100098506",
  "value": true
}
*/
// begin update active status


// begin get all goods by on_kaspi

router.get('/on_kaspi', async (req, res) => {
  const result = await mongoStorage.find({ 'offerData.on_kaspi': { $ne: false } }, { 'offerData.kaspi_id': true }).lean().exec()
  res.json(result)
})

// end get all goods by on_kaspi


// begin get all goods by prev_kaspi

router.get('/prev_kaspi', async (req, res) => {
  const result = await mongoStorage.find({ 'offerData.prev_kaspi': { $ne: false } }, { 'offerData.kaspi_id': true, 'offerData.prev_kaspi': true, 'offerData.on_kaspi': true, 'offerData.name': true, 'offerData.price': true  }).lean().exec()
  res.json(result)
})

// end get all goods by prev_kaspi


// begin get all categories

router.get('/getAllCategories', async (req, res) => {
  const tree = await mongoCategoryTree.findOne({ trigger: 'current' }, { tree: true, _id: false }).lean().exec()
  const resultArray = new Array()
  for (const key in tree.tree) {
    const tmp = {
      [key]: tree.tree[key]
    }
    resultArray.push(tmp)
  }
  res.status(200).json(resultArray)
})

/*
TEST:

GET http://localhost:3001/storage/getAllCategories HTTP/1.1
content-type: application/json
*/

// end get all categories


// begin add similar goods on product
router.post('/addSimilarGoods', async (req, res) => {
  const data = req.body

  const targetProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': data.kaspi_id }).lean().exec()
  const resultSimilarProducts = []

  data.similarProductsId.forEach(product => {
    if (
      !(targetProduct.similarProductsId.includes(product)) &&
      !(resultSimilarProducts.includes(product))
    ) {
      resultSimilarProducts.push(product)
    }
  })

  await mongoStorage.updateOne({ 'offerData.kaspi_id': data.kaspi_id }, { $push: { similarProductsId: resultSimilarProducts } }).exec()
  res.sendStatus(200)
})
/*
POST http://localhost:3001/storage/addSimilarGoods HTTP/1.1
content-type: application/json

{
  "kaspi_id": "100098508",
  "similarProductsId": [
    "100098506",
    "100098507"
  ]
}
*/
// end add similar goods on product


// begin remove similar goods
router.post('/removeSimilarGoods', async (req, res) => {
  const data = req.body
  console.log(data)
  const result = await mongoStorage.updateOne({ 'offerData.kaspi_id': data.kaspi_id }, { $pull: { similarProductsId: { $in: data.similarProductsId } } }).exec()
  console.log('remove similar: ', result)
  res.sendStatus(200)
})
/*
POST http://localhost:3001/storage/removeSimilarGoods HTTP/1.1
content-type: application/json

{
  "kaspi_id": "100098508",
  "similarProductsId": [
    "100098506",
    "100098507"
  ]
}
*/
// end remove similar goods


// begin get goods by category name

router.post('/filter/categories', async (req, res) => {
  const data = req.body

  let allGoods = await mongoStorage.find({ active: true }, {
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

  for (const key in data.categories) {
    if (key === 'firstLevelCategory') {
      allGoods = allGoods.filter(product => {
        return product.offerData.category_list[0] === data.categories[key]
      })
    }
    else if (key === 'secondLevelCategory') {
      allGoods = allGoods.filter(product => {
        return product.offerData.category_list[1] === data.categories[key]
      })
    }
    else if (key === 'thirdLevelCategory') {
      allGoods = allGoods.filter(product => {
        return product.offerData.category_list[2] === data.categories[key]
      })
    }
  }

  res.json(allGoods)
})//ТВ, Аудио, Видео

/*
POST https://textforeva.ru/storage/filter/categories HTTP/1.1
content-type: application/json

{
  "categories": {
    "firstLevelCategory": "Мобильные телефоны и аксессуары"
  }
}
*/

// end get goods by category name


// begin get goods by any level category

router.post('/getGoods/categories', async (req, res) => {
  const data = req.body

  let shop = await mongoStorage.find({ active: true }, {
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

  for (const key in data) {
    if (key === 'firstLevelCategory') {
      shop = shop.filter(element => {
        return element.offerData.category_list[0] === data[key]
      })
    }
    else if (key === 'secondLevelCategory') {
      shop = shop.filter(element => {
        return element.offerData.category_list[1] === data[key]
      })
    }
    else if (key === 'thirdLevelCategory') {
      shop = shop.filter(element => {
        return element.offerData.category_list[2] === data[key]
      })
    }
  }

  if (data.count) {
    shop = shop.slice(0, data.count)
  }

  res.json({ products: shop })
})

// end get goods by any level category


// begin WebSocket Client connection
wsClient.on('connection', async (client, data) => {
  const newClient = {
    connection: client,
    phoneNumber: data.url.substring(1)
  }

  wsClients.add(newClient)
  console.log(`connected client: ${newClient.phoneNumber}`)

  client.on('message', async msg => {
    console.log(msg)
    msg = JSON.parse(msg)

    console.log(msg)


    // begin check promoCode
    if (msg.action === 'checkPromoCode') {
      const data = msg.data

      const promoCode = await mongoPromoCode.findOne({ code: data.promoCode }, {sale: true, code: true}).lean().exec()

      if (promoCode) {
        client.send(JSON.stringify({ action: 'checkPromoCode', data: {ok: true, promoCode} }))
      } else {
        client.send(JSON.stringify({ action: 'checkPromoCode', data: {ok: false, errMSG: 'промокод истек либо был написан не правильно'} }))
      }
    }

    const start = new Date().getTime()
    // begin ws search
    if (msg.action === 'search') {
      const data = msg.data

      let shop = await mongoStorage.find({ active: true }, {
        active: true,
        salePrice: true,
        sale: true,
        'offerData.category_list': true,
        'offerData.images': true,
        'offerData.name': true,
        'offerData.price': true,
        'offerData.kaspi_id': true,
        'offerData.kaspi_rating': true,
        'offerData.properties': true,
        'offerData.actual_supplier': true,
        'offerData.product_count': true
      }).lean().exec()

      if (data.filters) {
        for (const key in data.filters) {
          if (key === "firstLevelCategory") {
            shop = shop.filter(element => {
              return element.offerData.category_list[0] === data.filters[key]
            })
          }
          else if (key === "secondLevelCategory") {
            shop = shop.filter(element => {
              return element.offerData.category_list[1] === data.filters[key]
            })
          }
          else if (key === "thirdLevelCategory") {
            shop = shop.filter(element => {
              return element.offerData.category_list[2] === data.filters[key]
            })
          }
          else if (key === "priceRange") {
            shop = shop.filter(element => {
              return element.salePrice >= Number(data.filters[key][0]) && element.salePrice <= Number(data.filters[key][1])
            })
          }
          else if (key === "switchers") {
            for (let index = 0; index < data.filters[key].length; index++) {
              const switcher = data.filters[key][index]
              shop = shop.filter(element => {
                for (const checkSwitchKey in element) {
                  if (checkSwitchKey === switcher.name) {
                    return switcher.value === element[checkSwitchKey]
                  }
                }

                // for (let index1 = 0; index1 < element.offerData.param.length; index1++) {
                //   const checkSwitchKey = element.offerData.param[index1]
                //   if (checkSwitchKey['@_name'] === switcher.name) {
                //     return checkSwitchKey['#text'] === switcher.value
                //   }
                // }

                return false
              })
            }
          }
          else if (key === "exceptions") {
            const exceptionsArrayPrototype = new Array()

            for (const filterException of data.filters[key]) {
              const sameNameExceptionsTrash = data.filters[key].filter(exceptionElement => {
                return filterException.name === exceptionElement.name
              })

              const sameNameExceptions = new Array()
              for (const trash of sameNameExceptionsTrash) {
                sameNameExceptions.push(trash.value)
              }

              exceptionsArrayPrototype.push({ name: filterException.name, values: sameNameExceptions })
            }

            for (let index = 0; index < exceptionsArrayPrototype.length; index++) {
              shop = shop.filter(element => {
                for (const indexKey in element.offerData.properties) {
                  if (indexKey === exceptionsArrayPrototype[index].name) {
                    console.log(exceptionsArrayPrototype[index])
                    return exceptionsArrayPrototype[index].values.includes(element.offerData.properties[indexKey])
                  }
                }

                return false
              })
            }

            // for (let index = 0; index < data.filters[key].length; index++) {
            //   const exception = data.filters[key][index]

            //   const tmp = shop.filter(element => {
            //     for (const indexKey in element.offerData.properties) {
            //       if (indexKey === exception.name) {
            //         return element.offerData.properties[indexKey] === exception.value
            //       }
            //     }

            //     return false
            //   })
            //   shop.push(tmp)
            // }
          }
        }
      }
      if (data.query) {
        const queryArray = data.query.toLowerCase().split('')
        const resultArray = new Array()
        shop.forEach((product) => {
          let preProductName = product.offerData.name.toLowerCase()
          let coincidence = 0
          // preProductName.includes(data.query.toLowerCase())

          if (preProductName.includes(data.query.toLowerCase())) {
            const resProduct = {
              symbolsRangeAverage: 0,
              tmpProduct: product
            }

            resultArray.push(resProduct)
          } else {
            let preCutedQuery = ''

            queryArray.forEach(symbol => {
              if (preProductName.includes(symbol)) {
                coincidence++
                preCutedQuery += symbol
              }
            })

            const result = (coincidence / queryArray.length) * 100

            if (result >= 80) {
              preCutedQuery = preCutedQuery.trim()
              console.log('query: ', preCutedQuery)
              const preCutedQuerySeparated = preCutedQuery.split(' ')
              let symbolsRangeAverageArray = []
              for (let cutedQuery of preCutedQuerySeparated) {
                let productName = preProductName

                const resultRegExp = productName.match(new RegExp(regExpGenerate(productName, cutedQuery, cutedQuery, 0)))
                console.log('preRegExp: ', resultRegExp)
                if (resultRegExp) {
                  cutedQuery = cutedQuery.split('')
                  productName = resultRegExp[0].split('')
                  const symbolIndices = new Array()
                  console.log('RegExp: ', productName)
                  cutedQuery.forEach(symbol => {
                    symbolIndices.push(findIndices(productName, symbol))
                  })

                  symbolIndices.forEach((symbol, index) => {
                    if (symbol.includes(-1)) {
                      symbolIndices.splice(index, 1)
                    }
                  })

                  const symbolsRangeArray = new Array()

                  for (let index = 1; index < symbolIndices.length; index++) {
                    const result = nearNumberArray(symbolIndices[index - 1], symbolIndices[index])

                    symbolIndices[index - 1] = [result.first]
                    symbolIndices[index] = [result.second]

                    if (symbolIndices[index - 1][0] < symbolIndices[index][0]) {
                      symbolsRangeArray.push(symbolIndices[index][0] - symbolIndices[index - 1][0])
                    } else {
                      symbolsRangeArray.push((symbolIndices[index][0] - symbolIndices[index - 1][0]) * Math.PI)
                    }
                  }

                  let symbolsRangeAverage = (cutedQuery.length === queryArray.length) ? (arraySum(symbolsRangeArray) / cutedQuery.length) : (arraySum(symbolsRangeArray) / cutedQuery.length + 1)

                  if (symbolsRangeAverage < 0) {
                    symbolsRangeAverage *= -1
                  }

                  symbolsRangeAverageArray.push(symbolsRangeAverage)
                }
              }

              let symbolsRangeAverageArraySum = 0

              for (const range of symbolsRangeAverageArray) {
                symbolsRangeAverageArraySum += range
              }

              const resProduct = {
                symbolsRangeAverage: symbolsRangeAverageArraySum / symbolsRangeAverageArray.length,
                tmpProduct: product
              }
              if (product.offerData.name.includes('колонка')) {
                console.log('range: ', resProduct.symbolsRangeAverage)
              }
              if (resProduct.symbolsRangeAverage <= 2)
                resultArray.push(resProduct)
            }
          }
        })
        resultArray.sort(function (a, b) {
          if (a.symbolsRangeAverage < b.symbolsRangeAverage) {
            return -1
          }
          if (a.symbolsRangeAverage > b.symbolsRangeAverage) {
            return 1
          }
          return 0
        })

        const finishAnswerArray = new Array()

        resultArray.forEach(element => {
          console.log(element.tmpProduct.offerData.name, element.symbolsRangeAverage)
          if (Object.keys(element).includes('tmpProduct')) {
            finishAnswerArray.push(element.tmpProduct)
          } else {
            finishAnswerArray.push(element)
          }
        })

        shop = finishAnswerArray
      }

      if (shop.length === 0) {
        client.send(JSON.stringify({ priceRange: [0,0], filterKeys: [], products: [] }))
      } else {
        let allProducts = []

        const filterKeys = {}

        if (!data.query) {
          allProducts = await mongoStorage.find({ active: true }, {
            active: true,
            salePrice: true,
            sale: true,
            'offerData.category_list': true,
            'offerData.images': true,
            'offerData.name': true,
            'offerData.price': true,
            'offerData.kaspi_id': true,
            'offerData.kaspi_rating': true,
            'offerData.properties': true,
            'offerData.actual_supplier': true,
            'offerData.product_count': true
          }).lean().exec()

          for (const key in data.filters) {
            if (key === "firstLevelCategory") {
              allProducts = allProducts.filter(element => {
                return element.offerData.category_list[0] === data.filters[key]
              })
            }
            else if (key === "secondLevelCategory") {
              allProducts = allProducts.filter(element => {
                return element.offerData.category_list[1] === data.filters[key]
              })
            }
            else if (key === "thirdLevelCategory") {
              allProducts = allProducts.filter(element => {
                return element.offerData.category_list[2] === data.filters[key]
              })
            }
          }

          for (const product of allProducts) {
            for (const property of Object.keys(product.offerData.properties)) {
              if (!(Object.keys(filterKeys).includes(property))) {
                filterKeys[property] = new Array()
              }

              if (!(filterKeys[property].includes(product.offerData.properties[property]))) {
                filterKeys[property].push(product.offerData.properties[property])
              }
            }
          }
        } else {
          for (const product of shop) {
            for (const property of Object.keys(product.offerData.properties)) {
              if (!(Object.keys(filterKeys).includes(property))) {
                filterKeys[property] = new Array()
              }

              if (!(filterKeys[property].includes(product.offerData.properties[property]))) {
                filterKeys[property].push(product.offerData.properties[property])
              }
            }
          }

          shop.forEach(element => {
            allProducts.push(element)
          })
        }

        allProducts.sort(function (a, b) {
          if (a.salePrice < b.salePrice) {
            return -1
          }
          if (a.salePrice > b.salePrice) {
            return 1
          }
          return 0
        })

        const finishAnswer = {
          priceRange: [allProducts[0].salePrice, allProducts[allProducts.length - 1].salePrice],
          filterKeys,
          products: shop
        }
        const end = new Date().getTime()
        console.log(`SecondWay WS: ${end - start}ms`)
        client.send(JSON.stringify(finishAnswer))
      }
    }
  })
  // end ws search

  client.on('close', () => {
    wsClients.delete(newClient)
    console.log(`deleted: ${newClient.phoneNumber}`)
  })
})

/*

POST http://localhost:3001/storage/search HTTP/1.1
content-type: application/json

{
  "query": "Ritmix",
  "filters": {
    "firstLevelCategory": "Аудиотехника",
    "secondLevelCategory": "Портативные колонки",
    "thirdLevelCategory": "Колонки"
    "priceRange": [500, 10000],
    "switchers": [
      {
        "name": "inStock",
        "value": true
      }
    ],
    "exceptions": [
      {
        "name": "тип",
        "value": "моно"
      },
      {
        "name": "мощность",
        "value": "3 Вт"
      }
    ]
  }
}

*/

String.prototype.replaceAt = function(index, replacement) {
  return this.substr(0, index) + replacement + this.substr(index + replacement.length)
}

function regExpGenerate (productName, str, recurseStr, iteration) {
  let result = new Array()
  let regExpression = str.split('').join('.*')

  result.push({result: productName.match(regExpression), expression: regExpression})

  getListIdx(regExpression, '*').forEach(element => {
    const tmpRegExpression = regExpression.replaceAt(element, '?')
    result.push({result: productName.match(tmpRegExpression), expression: tmpRegExpression})
  })

  getListIdx(regExpression, '*').forEach(element => {
    regExpression = regExpression.replaceAt(element, '?')
    result.push({result: productName.match(regExpression), expression: regExpression})
  })

  result = result.filter(element => {
    return element.result
  })
  result.sort((a, b) => a.result.length - b.result.length)

  if (productName === 'умная колонка harman/kardon citation 100 серый') {
    console.log('target: ', result, str)
  }

  if (result.length === 0) {
    if (iteration !== str.length + 1) {
      let tmpRecurseArr = recurseStr.split('')
      tmpRecurseArr.splice(iteration, 1)
      tmpRecurseArr = tmpRecurseArr.join('')
      const regExpRes = regExpGenerate(productName, tmpRecurseArr, recurseStr, iteration + 1)

      if (regExpRes) {
        return regExpRes
      }
    }

    return str.split('').join('.*')
  }
  else {
    return result[0].expression
  }
}

function getListIdx(str, substr) {
  let listIdx = []
  let lastIndex = -1
  while ((lastIndex = str.indexOf(substr, lastIndex + 1)) !== -1) {
    listIdx.push(lastIndex)
  }
  return listIdx
}

function nearNumberArray (arr1, arr2) {
  const rangesArray = new Array()
  arr2.forEach(element => {
    rangesArray.push({ first: nearNumber(arr1, element), second: element })
  })
  rangesArray.sort((a, b) => { return a.first.result - b.first.result && a.first.result > b.first.result })
  return { first: rangesArray[0].first.base, second: rangesArray[0].second }
}

// function nearNumber (arr, number) {
//   arr.map(it => {
//     const ch = (it >= 0 ? it : -it) + number
//     return {
//       base: it,
//       result: ch >= 0 ? ch : -ch
//     }
//   }).sort((a, b) => a.result - b.result)[0]
//   return arr[0]
// }

function arraySum (arr) {
  let result = 0
  for (const element of arr) {
    result += element
  }
  return result
}

function findIndices (str, symbol) {
  const indices = []
  if (str.includes(symbol)) {
    for(var i=0; i < str.length; i++) {
      if (str[i] === symbol) indices.push(i)
    }
  } else {
    indices.push(-1)
  }
  return indices
}

module.exports = router



// begin search items

// router.post('/search', async (req, res) => {
//   let data = req.body

//   let shop = await mongoStorage.find().exec()

//   if (data.filters) {
//     for (const key in data.filters) {
//       if (key === "category") {
//         shop = shop.filter(element => {
//           return element.offerData.category === data.filters[key]
//         })
//       }
//       else if (key === "priceRange") {
//         shop = shop.filter(element => {
//           return element.offerData.price >= data.filters[key][0] && element.offerData.price <= data.filters[key][1]
//         })
//       }
//       else if (key === "switchers") {
//         for (let index = 0; index < data.filters[key].length; index++) {
//           const switcher = data.filters[key][index]
//           shop = shop.filter(element => {
//             for (const checkSwitchKey in element.offerData) {
//               if (checkSwitchKey === switcher.name) {
//                 return switcher.value === element.offerData[checkSwitchKey]
//               }
//             }

//             for (let index1 = 0; index1 < element.offerData.param.length; index1++) {
//               const checkSwitchKey = element.offerData.param[index1]
//               if (checkSwitchKey['@_name'] === switcher.name) {
//                 return checkSwitchKey['#text'] === switcher.value
//               }
//             }

//             return false
//           })
//         }
//       }
//       else if (key === "exceptions") {
//         for (let index = 0; index < data.filters[key].length; index++) {
//           const exception = data.filters[key][index]
//           shop = shop.filter(element => {
//             for (let index1 = 0; index1 < element.offerData.param.length; index1++) {
//               const checkExceptionKey = element.offerData.param[index1]
//               if (checkExceptionKey['@_name'] === exception.name) {
//                 return checkExceptionKey['#text'] === exception.value
//               }
//             }

//             return false
//           })
//         }
//       }
//     }
//   }
//   if (data.query) {
//     const queryArray = data.query.split('')
//     const resultArray = new Array()
//     shop.forEach(product => {
//       let coincidence = 0
//       queryArray.forEach(symbol => {
//         if (product.offerData.name.includes(symbol))
//           coincidence++
//       })

//       const result = (coincidence / queryArray.length) * 100
//       console.log(product.offerData.name, queryArray, result)

//       if (result >= 80)
//         resultArray.push(product)
//     })
//     shop = resultArray
//   }

//   res.send(shop)
// })

// end search items
