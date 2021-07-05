GET http://157.230.225.244/storage/getAllCategories - получить дерево категорий
теперь возвращает все массивом проверь так или не так


POST http://157.230.225.244/storage/addSimilarGoods - добавление похожих товаров для определенного товара
тело запроса
{
  "kaspi_id": "100098508", // kaspi_id товара которому нужно добавить похожие товары
  "similarProductsId": [ // массив kaspi_id товаров которые нужно добавить
    "100098506",
    "100098507"
  ]
}


POST http://157.230.225.244/storage/removeSimilarGoods - удаление похожих товаров
тело запроса
{
  "kaspi_id": "100098508", // kaspi_id товара у которого нужно удалить похожие товары
  "similarProductsId": [ // массив kaspi_id товаров которые нужно удалить
    "100098506",
    "100098507"
  ]
}


GET http://157.230.225.244/storage/kaspi_id/:id - получить товар по kaspi id
теперь так же возвращает массив похожих товаров similarProducts


GET http://157.230.225.244/storage/mostPopular/freshProducts/:count - получение новых товаров, count это максимальное колличество товаров для получения


GET http://157.230.225.244/storage/mostPopular/thirdLevelCategories/:count - получение популярных категорий третьего уровня


GET http://157.230.225.244/storage/mostPopular/secondLevelCategories/:count - получение популярных категорий второго уровня


GET http://157.230.225.244/storage/mostPopular/firstLevelCategories/:count - получение популярных категорий первого уровня


GET http://157.230.225.244/storage/mostPopular/products/:count - получение популярных товаров



Заказы:

POST http://157.230.225.244/order - создание нового заказа
тело запроса:
{
  "address": "abay 150/230", // адрес доставки
  "phoneNumber": "+7(705)553-99-66", // номер телефона
  "email": "asqw0@bk.ru", // почта
  "goods": [ // массив заказаных товаров
    {
      "kaspi_id": "100098508", // kaspi_id заказаного товара
      "count": 3 // колличество этого товара
    },
    {
      "kaspi_id": "100098507",
      "count": 1
    }
  ],
  "name": "Dimash Kenzhegaliev", // имя
  "paymentMethod": "card", // способ оплаты, enum: 'card', 'cash' default: 'cash'
  "cardNumber": "9999" // четыре цифры номера карты
}
возвращает созданный заказ но со свойством finishPrice - итоговая сумма заказа с учетом скидок и тд


GET http://157.230.225.244/order - получить массив всех заказов


POST http://157.230.225.244/order/paymentStatus - изменить статус оплаты заказа
тело запроса
{
  "id": "id" // id заказа
  "paymentStatus": "paid/notPaid" // новый статус оплаты заказа default: 'notPaid'
}


POST http://157.230.225.244/order/orderStatus - изменить статус заказа
тело запроса
{
  "id": "id" // id заказа
  "orderStatus": "preparedForDelivery/sented/delivered" // новый статус заказа default: 'preparedForDelivery'
}


POST http://157.230.225.244/categoryTree/addImage - добавить картинку для категории любого уровня
тело запроса
{
  "category": "categoryName" // название категории,
  "file": "File" // файл картинки обязательно должен быть в formData и не FileList а File пример отправки картинки есть на бэке backEnd/test-front
  "url": "imageUrl" // url картинки, отправляешь если не отправляешь File
}


GET http://157.230.225.244/categoryTree/download/:categoryName - получить картинку категории по названию категории