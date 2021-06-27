const router = require('express').Router()

const mongoCategoryTree = require('../models/CategoryTree.js').mongoCategoryTree

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

module.exports = router