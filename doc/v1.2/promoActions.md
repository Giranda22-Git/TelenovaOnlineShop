POST https://textforeva.ru/promoAction/ - создание промо акции
теперь при создании промо акции можно добавить новый необязательный параметр
{
  "name": String
}

также когда ты получаешь заказ любым способом будет добавлен новый параметр
productKaspiIdData - этот параметр есть только если акция предназначена для одного товара!!
содержит в себе все данные о товаре над которым в данный момент проводится промо акция


новая конечная точка :

DELETE https://textforeva.ru/promoAction/ - удаление промоакции по id
тело запроса:
{
  "id": mongoObjectId // id промоакции которую нужно удалить
}