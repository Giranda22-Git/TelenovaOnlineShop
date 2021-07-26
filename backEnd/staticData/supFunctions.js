const mongoStorage = require('../models/Storage.js').mongoStorage
const mongoPromoAction = require('../models/PromoAction.js').mongoPromoAction

async function promoActionMiddleware (promoActionId, factor, type) {
  if (type) {
    const saleProducts = await mongoPromoAction.findById(promoActionId, { productsSaleArray: true, sale: true, _id: false }).lean().exec()

    for (const product of saleProducts.productsSaleArray) {
      await mongoStorage.updateOne(
        { 'offerData.kaspi_id': product.offerData.kaspi_id },
        {
          $inc: { sale: saleProducts.sale * factor, salePrice: -(product.offerData.price * (saleProducts.sale / 100)) * factor }
        }
      ).exec()
    }
  } else {
    const promoData = await mongoPromoAction.findById(promoActionId, { productKaspiId: true, sale: true, _id: false }).lean().exec()
    const productData = await mongoStorage.findOne({ 'offerData.kaspi_id': promoData.productKaspiId }, { 'offerData.price': true, _id: false }).lean().exec()

    await mongoStorage.updateOne(
      { 'offerData.kaspi_id': promoData.productKaspiId },
      { $inc: { sale: promoData.sale * factor, salePrice: -(productData.offerData.price * (promoData.sale / 100)) * factor } }
    ).exec()
  }
}



module.exports = { promoActionMiddleware }