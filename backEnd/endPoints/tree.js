const router = require('express').Router()
const multer = require('multer')
const fs = require('fs')

const mongoCategoryTree = require('../models/CategoryTree.js').mongoCategoryTree
const mongoCategoryList = require('../models/CategoryList.js').mongoCategoryList

const serverData = require('../staticData/mountedData.js').data

const tmpDir = __dirname + '/categoryImages/'
const upload = multer({ dest: './endPoints/categoryImages/' })


// begin get file by filename
router.get('/', async (req, res) => {
  const result = await mongoCategoryList.find().exec()
  res.status(200).send(JSON.stringify(result))
})


router.get('/download/:filename', async (req, res) => {
  const product = await mongoCategoryList.findOne({ 'image.fileName': req.params.filename }).exec()

  if (product.image.fileName === req.params.filename) {
    res.sendFile(`${tmpDir}${product.image.fileName}`)
  }
})
/*
TEST:
GET http://localhost:3001/categoryTree/download/ТВ, Аудио, Видео.jpeg HTTP/1.1
content-type: application/json
*/
// end get file by filename


// begin create new Tree

router.post('/createCategoryTree', async (req, res) => {
  const isExists = await mongoCategoryTree.findOne({ trigger: 'current' })

  if (!isExists) {
    const newTree = new mongoCategoryTree({})
    await newTree.save()
  }

  res.sendStatus(200)
})
/*
POST http://localhost:3001/categoryTree/createCategoryTree HTTP/1.1
content-type: application/json
*/
// end create new Tree


// begin add image for categories

router.post('/addImage', upload.single('file'), async (req, res) => {
  try {
    const data = req.body
    const file = req.file

    if (file) {
      const validTypes = ['svg+xml', 'png', 'gif', 'jpeg']

      let image = {}

      const targetCategory = await mongoCategoryList.findOne({ name: data.category }).exec()

      console.log(file, 'check filetype')

      const fileType = file.mimetype.split('/')

      if (file.size > 10000000) {
        delBadFile(file.filename)
        res.status(500).json({
          type: 'error',
          message: 'Файл слишком большой'
        })
      }
      if (fileType[0] !== 'image') {
        delBadFile(file.filename)
        res.status(500).json({
          type: 'error',
          message: 'Загружать можно только изображения'
        })
      }
      if (validTypes.includes(fileType[1])) {
        const newFileName = targetCategory.name + `.${fileType[1]}`
        fs.renameSync(tmpDir + file.filename, tmpDir + newFileName)

        image = {
          clientPath: `${serverData.interiorServerUrl}categoryTree/download/${newFileName}`,
          fileName: newFileName
        }
      } else {
        delBadFile(file.filename)
        res.status(500).json({
          type: 'error',
          message: 'недопустимый формат изображения'
        })
      }

      await mongoCategoryList.updateOne({ name: data.category }, { image: image }).exec()
    }
    else if (data.url) {
      await mongoCategoryList.updateOne({ name: data.category }, { image: { clientPath: data.url } }).exec()
    }

    res.sendStatus(200)
  }
  catch (err) {
    console.log('catching: ' + err)
    res.sendStatus(500)
  }

})
/*
POST http://localhost:3001/categoryTree/addImage HTTP/1.1
content-type: application/json

{
  "category": "Фото- и видеокамеры",
  "url": "https://lh3.googleusercontent.com/proxy/icCdaAxNX9lT1pqp7JPC0WjYgmlCC9-iHPZ2r2crSnrk-7foPKx40BnqGUHpqst-C3u9nu0uLMkEn2zlKZA8ay40UUi88u7TbTBHs1LSyjTlONvaiH_fc2A"
}
*/
// end add image for categories

function delBadFile(fileName) {
  fs.unlinkSync(tmpDir + '/' + fileName)
}

module.exports = router