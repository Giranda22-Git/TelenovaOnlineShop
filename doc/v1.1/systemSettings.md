GET https://textforeva.ru/systemSetting/ - получение массива состояний всех настраиваемых систем

GET https://textforeva.ru/systemSetting/:systemName - получение статуса системы по ее имени
возвращяет:
{
  "status": true/false
}

POST https://textforeva.ru/systemSetting/ - изменение статуса система по ее имени
тело запроса:
{
  "systemName": "calculator", // имя существующей системы
  "status": true/false // новый статус этой системы
}