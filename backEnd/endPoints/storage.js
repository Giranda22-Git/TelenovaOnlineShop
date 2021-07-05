const router = require('express').Router()
const WebSocket = require('ws')
const wsClient = new WebSocket.Server({ port: 1000 })

const wsClients = new Set()

const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoCategoryTree = require('../models/CategoryTree.js').mongoCategoryTree
const mongoCategoryList = require('../models/CategoryList.js').mongoCategoryList

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

router.get('/', async (req, res) => {
  const result = await mongoStorage.find().exec()
  res.status(200).json(result)
})

// begin add new goods
router.post('/addGoods', async (req, res) => {
  const data = req.body
  console.log(data)
  // добавление всех товаров на склад
  for (const offer of data.offers) {
    const inStock = await mongoStorage.findOne({ 'offerData.kaspi_id': offer.kaspi_id })
    if (inStock) {
      await mongoStorage.updateOne({ 'offerData.kaspi_id': offer.kaspi_id }, { offerData: offer })
      if (!array_compare(inStock.offerData.category_list, offer.category_list)) {
        // удаление категорий в случае их изменения
        deleteVoidCategoryTree(inStock.offerData.category_list[0], inStock.offerData.category_list[1], inStock.offerData.category_list[2])
      }
    } else {
      const tmp = new mongoStorage({
        offerData: offer,
        dateOfCreature: new Date()
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
  let allProducts = await mongoStorage.find().exec()

  allProducts.sort(function (a, b) {
    if (a.countOfSold > b.countOfSold) {
      return -1
    }
    if (a.countOfSold < b.countOfSold) {
      return 1
    }
    return 0
  })

  allProducts = allProducts.slice(0, req.params.count)

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
  let categoryList = await mongoCategoryList.find({ level: 1 }).exec()

  categoryList.sort(function (a, b) {
    if (a.countOfSold > b.countOfSold) {
      return -1
    }
    if (a.countOfSold < b.countOfSold) {
      return 1
    }
    return 0
  })

  categoryList = categoryList.slice(0, req.params.count)

  res.json(categoryList)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/firstLevelCategories/4 HTTP/1.1
content-type: application/json
*/
// end get most popular first level categories


// begin get most popular second level categories

router.get('/mostPopular/secondLevelCategories/:count', async (req, res) => {
  let categoryList = await mongoCategoryList.find({ level: 2 }).exec()

  categoryList.sort(function (a, b) {
    if (a.countOfSold > b.countOfSold) {
      return -1
    }
    if (a.countOfSold < b.countOfSold) {
      return 1
    }
    return 0
  })

  categoryList = categoryList.slice(0, req.params.count)

  res.json(categoryList)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/secondLevelCategories/4 HTTP/1.1
content-type: application/json
*/
// end get most popular second level categories


// begin get most popular third level categories

router.get('/mostPopular/thirdLevelCategories/:count', async (req, res) => {
  let categoryList = await mongoCategoryList.find({ level: 3 }).exec()

  categoryList.sort(function (a, b) {
    if (a.countOfSold > b.countOfSold) {
      return -1
    }
    if (a.countOfSold < b.countOfSold) {
      return 1
    }
    return 0
  })

  categoryList = categoryList.slice(0, req.params.count)

  res.json(categoryList)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/thirdLevelCategories/40 HTTP/1.1
content-type: application/json
*/
// end get most popular third level categories


// begin get new prodcuts

router.get('/mostPopular/freshProducts/:count', async (req, res) => {
  let allProducts = await mongoStorage.find().exec()

  allProducts.sort(function (a, b) {
    if (a.dateOfCreature < b.dateOfCreature) {
      return -1
    }
    if (a.dateOfCreature > b.dateOfCreature) {
      return 1
    }
    return 0
  })

  allProducts = allProducts.slice(0, req.params.count)

  res.json(allProducts)
})
/*
TEST:

GET http://localhost:3001/storage/mostPopular/freshProducts/4 HTTP/1.1
content-type: application/json
*/
// end get new prodcuts


// begin get item by kaspi id
router.get('/kaspi_id/:id', async (req, res) => {
  const targetProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': req.params.id }).exec()
  const similarProducts = []

  for (const product of targetProduct.similarProductsId) {
    const tmp = await mongoStorage.findOne({ 'offerData.kaspi_id': product }).exec()
    similarProducts.push(tmp)
  }
  await mongoStorage.updateOne({ 'offerData.kaspi_id': req.params.id }, { similarProducts: similarProducts }).exec()
  const result = await mongoStorage.findOne({ 'offerData.kaspi_id': req.params.id }).exec()
  res.json(result)
})
// end get item by kaspi id


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


// begin get all categories

router.get('/getAllCategories', async (req, res) => {
  const tree = await mongoCategoryTree.findOne({ trigger: 'current' }).exec()
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

  const targetProduct = await mongoStorage.findOne({ 'offerData.kaspi_id': data.kaspi_id }).exec()
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

  await mongoStorage.updateOne({ 'offerData.kaspi_id': data.kaspi_id }, { $pull: { similarProductsId: { $in: data.similarProductsId } } }).exec()
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


// begin WebSocket Client connection
wsClient.on('connection', async (client, data) => {
  const newClient = {
    connection: client,
    phoneNumber: data.url.substring(1)
  }

  wsClients.add(newClient)
  console.log(`connected client: ${newClient.phoneNumber}`)

  client.on('message', async msg => {
    msg = JSON.parse(msg)

    console.log(msg)

    // begin ws search
    if (msg.action === 'search') {
      const data = msg.data

      let shop = await mongoStorage.find().exec()

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
              return element.offerData.price >= data.filters[key][0] && element.offerData.price <= data.filters[key][1]
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
            for (let index = 0; index < data.filters[key].length; index++) {
              const exception = data.filters[key][index]

              // shop = shop.filter(element => {
              //   for (let index1 = 0; index1 < element.offerData.param.length; index1++) {
              //     const checkExceptionKey = element.offerData.param[index1]
              //     if (checkExceptionKey['@_name'] === exception.name) {
              //       return checkExceptionKey['#text'] === exception.value
              //     }
              //   }

              //   return false
              // })

              shop = shop.filter(element => {
                for (const indexKey in element.offerData.properties) {
                  if (indexKey === exception.name) {
                    return element.offerData.properties[indexKey] === exception.value
                  }
                }

                return false
              })

            }
          }
        }
      }
      if (data.query) {
        const queryArray = data.query.split('')
        const resultArray = new Array()
        shop.forEach(product => {
          let coincidence = 0
          queryArray.forEach(symbol => {
            if (product.offerData.name.includes(symbol))
              coincidence++
          })

          const result = (coincidence / queryArray.length) * 100
          console.log(product.offerData.name, queryArray, result)

          if (result >= 80)
            resultArray.push(product)
        })
        shop = resultArray
      }

      const filterKeys = {}
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

      for (const key in filterKeys) {
        if (filterKeys[key].length === 1) {
          delete filterKeys[key]
        }
      }

      const finishAnswer = {
        filterKeys,
        products: shop
      }

      client.send(JSON.stringify(finishAnswer))
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
