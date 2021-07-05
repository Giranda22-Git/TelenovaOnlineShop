const data = {
  mongoUrl: 'mongodb://localhost:27017/TelenovaOnlineShop',
	serverUrl: 'http://localhost:3001/',
  interiorServerUrl: 'http://157.230.225.244/',
	PORT: 3001
}

const mongoCategoryTree = require('../models/CategoryTree.js').mongoCategoryTree

async function mountedCreateNewCategoryTree () {
  const forGenerateNewCategoryTree = await mongoCategoryTree.find({ trigger: 'current' }).exec()
  if (forGenerateNewCategoryTree.length !== 1) {
    const newTree = new mongoCategoryTree({})
    await newTree.save()
  }
}

module.exports = {data, mountedCreateNewCategoryTree}