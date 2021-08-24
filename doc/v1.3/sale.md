GET https://textforeva.ru/sale - получить массив всех активных скидок

POST https://textforeva.ru/sale - создание бессрочной скидки для товара
тело запроса:
{
  "productKaspiId": kaspi_id,
  "sale": number
}

delete https://textforeva.ru/sale - удаление бессрочной скидки
тело запроса:
{
  "productKaspiId": kaspi_id
}