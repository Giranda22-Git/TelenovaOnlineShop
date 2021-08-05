const router = require('express').Router()

const mongoSystemSettings = require('../models/SystemSettings.js').mongoSystemSettings


// begin get all systems

router.get('/', async (req, res) => {
  const result = await mongoSystemSettings.find().exec()
  res.json(result)
})

// end get all systems




// begin create new system

router.post('/', async (req, res) => {
  const data = req.body

  const newSystem = mongoSystemSettings({
    systemName: data.systemName
  })

  const result = await newSystem.save()

  res.json(result)
})
/*
POST http://localhost:3001/systemSetting/ HTTP/1.1
content-type: application/json

{
  "systemName": "calculator"
}
*/
// end create new system


// begin switch systems status

router.post('/switchStatus', async (req, res) => {
  const data = req.body

  const result = await mongoSystemSettings.updateOne(
    { systemName: data.systemName },
    { status: data.status }
  )

  res.json(result)
})
/*
POST http://localhost:3001/systemSetting/switchStatus HTTP/1.1
content-type: application/json

{
  "systemName": "calculator",
  "status": true
}
*/
// end switch systems status


// begin get system by systemName

router.get('/:systemName', async (req, res) => {
  const result = await mongoSystemSettings.findOne({ systemName: req.params.systemName }, { status: true, _id: false }).lean().exec()

  res.json(result)
})

// end get system by systemName


module.exports = router