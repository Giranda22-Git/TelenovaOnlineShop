
GET https://textforeva.ru/promoCode/ - получение массива всех активных промокодов

POST https://textforeva.ru/promoCode/ - создание нового промокода

тело запроса:

{
  "date": "2021-07-24T09:23:34.240Z", // дата окончания промокода, он должен быть обязательно > текущей даты и время
  "sale": 20 // процент скидки
  "code": "code" // необязательный параметр, если передать то это и будет промокод только он должен быть уникальным иначе ошибка, если не передавать то промокод сгенерируется сам
}
возвращает созданный промокод


DELETE https://textforeva.ru/promoCode/ - удаление промокода
{
  "id": "id" // id промокода
}


POST https://textforeva.ru/promoCode/switchSale - изменение скидки существующего промокода
тело запроса:
{
  "id": "id" // id промокода
  "sale": "20" // процент новой скидки
}


Измененный запрос

POST https://textforeva.ru/order - изменен теперь можно отправлять промокод
{
  "promoCode": "code" // необязательный параметр, помимо старых параметров можешь добавить и этот, расчитывает стоимость заказа с учетом скидки от этого промокода если такой существует
}


WebSocket

"action": "checkPromoCode" - проверяет существует ли такой промокод
"data": {
  "promoCode": "code" // код промокода
}
возвращает
{
  "action": "checkPromoCode",
  "data": {
    "ok": true/false // true: существует, false: не сущесствует,
    "promoCode": "promoCode" // обьект содержащий sale и code этого промокода, возвращается только если ok == true,
    "errMSG": "errMSG" // просто текст ошибки, возвращается только если ok == false
  }
}
