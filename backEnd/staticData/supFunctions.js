const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoPromoAction = require('../models/PromoAction.js').mongoPromoAction

async function promoActionMiddleware (promoActionId, factor) {
  const saleProducts = await mongoPromoAction.findById(promoActionId, { productsSaleArray: 1, sale: 1, _id: false }).lean().exec()

  for (const product of saleProducts.productsSaleArray) {
    await mongoStorage.updateOne(
      { 'offerData.kaspi_id': product.offerData.kaspi_id },
      { $inc: { sale: saleProducts.sale * factor } }
    ).exec()
  }
}



module.exports = { promoActionMiddleware }