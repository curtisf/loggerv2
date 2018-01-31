const os = require('os')
const Influx = require('influx')
const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'testinflux',
  schema: [
    {
      measurement: 'test_value',
      fields: {
        looped_num: Influx.FieldType.INTEGER
      },
      tags: [
        'host'
      ]
    }
  ]
})

let num = 0

setInterval(() => {
  console.log('sent ', num)
  ++num
  influx.writePoints([
    {
      measurement: 'testinflux',
      tags: { host: os.hostname() },
      fields: { looped_num: num }
    }
  ]).catch(err => {
    console.error(`Error saving data to InfluxDB! ${err.stack}`)
  })
}, 2000)
