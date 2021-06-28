GET http://157.230.225.244/storage - получить массив всех товаров


GET http://157.230.225.244/storage/kaspi_id/:id - получить товар по kaspi id


GET http://157.230.225.244/storage/getAllCategories - получить дерево категорий


POST http://157.230.225.244/storage/deleteGoods - удаляет товары по kaspi id
тело запроса:
{
  "deleteArray": [
    "kaspi_id",
    "kaspi_id"
  ]
}


POST http://157.230.225.244/storage/updateInStock - делает товар в наличии или наоборот
тело запроса:
{
  "kaspi_id": "kaspi_id" // kaspi id товара который нужно изменить
  "value": true/false // true - товар в наличии / false - не в наличии
}


POST http://157.230.225.244/storage/updateActive - делает товар активным/неактивным
тело запроса:
{
  "kaspi_id": "kaspi_id" // kaspi id товара который нужно изменить
  "value": true/false // true - товар в активный / false - не активный
}


