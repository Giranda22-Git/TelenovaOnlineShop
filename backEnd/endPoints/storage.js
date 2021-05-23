const router = require('express').Router()
const xml_parser = require('fast-xml-parser')

const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoBackUp = require('../models/BackUp.js').mongoBackUp

router.get('/', async (req, res) => {
  const result = await mongoStorage.find().exec()
  res.status(200).json(result)
})

// begin new data parser
router.post('/updateData', async (req, res) => {
  let data =
    `
    <?xml version="1.0" encoding="UTF-8"?>
    <yml_catalog date="2020-11-22T14:37:38+03:00">
        <shop>
            <name>BestSeller</name>
            <company>Tne Best inc.</company>
            <url>https://randart.ru/art/JD99/wallpapers</url>
            <currencies>
                <currency id="RUR" rate="1"/>
            </currencies>
            <categories>
                <category id="1">Бытовая техника</category>
                <category id="10" parentId="1">Мелкая техника для кухни</category>
            </categories>
            <delivery-options>
                <option cost="200" days="1"/>
            </delivery-options>
            <offers>
                <offer id="9012">
                    <name>Мороженица Brand 3811</name>
                    <url>https://randart.ru/art/JD99/wallpapers</url>
                    <price>60000</price>
                    <currencyId>RUR</currencyId>
                    <category>Laptop</category>
                    <delivery>true</delivery>
                    <delivery-options>
                        <option cost="300" days="1" order-before="18"/>
                    </delivery-options>
                    <param name="Цвет">белый</param>
                    <param name="Вес">3.4кг</param>
                    <weight>3.6</weight>
                    <dimensions>20.1/20.551/22.5</dimensions>
                </offer>
                <offer id="9012">
                    <name>Мороженица Brand 3811</name>
                    <url>https://randart.ru/art/JD99/wallpapers</url>
                    <price>8990</price>
                    <currencyId>RUR</currencyId>
                    <category>Television</category>
                    <delivery>true</delivery>
                    <delivery-options>
                        <option cost="300" days="1" order-before="18"/>
                    </delivery-options>
                    <param name="Цвет">белый</param>
                    <param name="Вес">3.4кг</param>
                    <weight>3.6</weight>
                    <dimensions>20.1/20.551/22.5</dimensions>
                </offer>
                <offer id="9012">
                    <name>Мороженица Brand 3811</name>
                    <url>https://randart.ru/art/JD99/wallpapers</url>
                    <price>8990</price>
                    <currencyId>RUR</currencyId>
                    <category>Phones</category>
                    <delivery>true</delivery>
                    <delivery-options>
                        <option cost="300" days="1" order-before="18"/>
                    </delivery-options>
                    <param name="Цвет">белый</param>
                    <param name="Вес">3.4кг</param>
                    <weight>3.6</weight>
                    <dimensions>20.1/20.551/22.5</dimensions>
                </offer>
                <offer id="9012">
                    <name>Мороженица Brand 3811</name>
                    <url>https://randart.ru/art/JD99/wallpapers</url>
                    <price>8990</price>
                    <currencyId>RUR</currencyId>
                    <category>Headphones</category>
                    <delivery>true</delivery>
                    <delivery-options>
                        <option cost="300" days="1" order-before="18"/>
                    </delivery-options>
                    <param name="Цвет">белый</param>
                    <param name="Вес">3.4кг</param>
                    <weight>3.6</weight>
                    <dimensions>20.1/20.551/22.5</dimensions>
                </offer>
                <offer id="9012">
                    <name>Мороженица Brand 3811</name>
                    <url>https://randart.ru/art/JD99/wallpapers</url>
                    <price>8990</price>
                    <currencyId>RUR</currencyId>
                    <category>Computers</category>
                    <delivery>true</delivery>
                    <delivery-options>
                        <option cost="300" days="1" order-before="18"/>
                    </delivery-options>
                    <param name="Цвет">белый</param>
                    <param name="Вес">3.4кг</param>
                    <weight>3.6</weight>
                    <dimensions>20.1/20.551/22.5</dimensions>
                </offer>
                <offer id="9012">
                    <name>Мороженица Brand 3811</name>
                    <url>https://randart.ru/art/JD99/wallpapers</url>
                    <price>8990</price>
                    <currencyId>RUR</currencyId>
                    <category>Cameras</category>
                    <delivery>true</delivery>
                    <delivery-options>
                        <option cost="300" days="1" order-before="18"/>
                    </delivery-options>
                    <param name="Цвет">белый</param>
                    <param name="Вес">3.4кг</param>
                    <weight>3.6</weight>
                    <dimensions>20.1/20.551/22.5</dimensions>
                </offer>
                <offer id="9012">
                    <name>Мороженица Brand 3811</name>
                    <url>https://randart.ru/art/JD99/wallpapers</url>
                    <price>8990</price>
                    <currency>Sony Playstations</currency>
                    <categoryId>10</categoryId>
                    <delivery>true</delivery>
                    <delivery-options>
                        <option cost="300" days="1" order-before="18"/>
                    </delivery-options>
                    <param name="Цвет">белый</param>
                    <param name="Вес">3.4кг</param>
                    <weight>3.6</weight>
                    <dimensions>20.1/20.551/22.5</dimensions>
                </offer>
            </offers>
            <gifts>
                <!-- подарки не из прайс‑листа -->
            </gifts>
            <promos>
                <!-- промоакции -->
            </promos>
        </shop>
    </yml_catalog>
    `
  const options = {
    ignoreAttributes: false
  }

  data = xml_parser.parse(data, options)

  data.yml_catalog.shop.offers.offer.forEach(async offer => {
    const tmp = new mongoStorage({
      offerData: offer
    })
    await tmp.save()
  })

  const oldBackUp = await mongoBackUp.findOne({ trigger: 'current' }).exec()
  if (oldBackUp) {
    await mongoBackUp.deleteOne({ trigger: 'current' }).exec()
  }

  const newBackUp = new mongoBackUp({
    allData: data
  })
  await newBackUp.save()

  res.send(oldBackUp)
})

/*
TEST:

POST http://localhost:3000/storage/updateData HTTP/1.1
content-type: application/json

*/
// end new data parser



// begin get all categories

router.get('/getAllCategories', async (req, res) => {
  const currentBackUp = await mongoBackUp.findOne({ trigger: 'current' }).exec()
  res.send(currentBackUp.allData.yml_catalog.shop.categories.category)
})

/*
TEST:

GET http://localhost:3000/storage/getAllCategories HTTP/1.1
content-type: application/json
*/

// end get all categories


// begin search items by category

router.post('/search/category', async (req, res) => {
  const data = req.body
  const filteredItems = await mongoStorage.find({ 'offerData.categoryId': Number(data.categoryId) }).exec()
  console.log(filteredItems)
  res.send(filteredItems)
})
/*

POST http://localhost:3000/storage/search/category HTTP/1.1
content-type: application/json

{
    "categoryId": "5"
}

*/

// end search items by category



// begin search items by price (n to n)

router.post('/search/filter', async (req, res) => {
  let data = req.body

  let shop = await mongoStorage.find().exec()

  for (const key in data.filters) {
    if (key === "category") {
      shop = shop.filter(element => {
        return element.offerData.categoryId === data.filters[key]
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
          for (const checkSwitchKey in element.offerData) {
            if (checkSwitchKey === switcher.name) {
              return switcher.value === element.offerData[checkSwitchKey]
            }
          }

          for (let index1 = 0; index1 < element.offerData.param.length; index1++) {
            const checkSwitchKey = element.offerData.param[index1]
            if (checkSwitchKey['@_name'] === switcher.name) {
              return checkSwitchKey['#text'] === switcher.value
            }
          }

          return false
        })
      }
    }
    else if (key === "exceptions") {
      for (let index = 0; index < data.filters[key].length; index++) {
        const exception = data.filters[key][index]
        shop = shop.filter(element => {
          for (let index1 = 0; index1 < element.offerData.param.length; index1++) {
            const checkExceptionKey = element.offerData.param[index1]
            if (checkExceptionKey['@_name'] === exception.name) {
              return checkExceptionKey['#text'] === exception.value
            }
          }

          return false
        })
      }
    }
  }

  res.send(shop)
})

/*

POST http://localhost:3000/storage/search/filter HTTP/1.1
content-type: application/json

{
    "filters": {
        "category": 2,
        "priceRange": [500, 10000],
        "switchers": [
            {
                "name": "inStock",
                "value": true
            },
            {
                "name": "delivery",
                "value": true
            }
        ],
        "exceptions": [
            {
                "name": "Цвет",
                "value": "красный"
            },
            {
                "name": "Вес",
                "value": "3.4кг"
            }
        ]
    }
}

*/

// end search items by price (n to n)

module.exports = router