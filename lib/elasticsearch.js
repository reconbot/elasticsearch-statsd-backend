const fetch = require('node-fetch')
const templates = require('./templates')

const elasticStats = {
  statusCalls: 0,
  metricCount: 0,
  inserts: 0,
  errors: 0,
  lastFlush: null
}

function ensureTemplates (context, templates) {
  const { url, indexPrefix } = context
  const templateNames = Object.keys(templates)
  return Promise.all(templateNames.map(templateName => {
    const template = templates[templateName]
    return fetch(`${url}/_template/${indexPrefix}_${templateName.toLowerCase()}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    }).then(resp => {
      if (resp.status !== 200) {
        return resp.json().then(data => {
          throw new Error(`Error creating template ${templateName}: HTTP ${resp.status}: ${JSON.stringify(data)}`)
        }, () => {
          throw new Error(`Error creating template ${templateName}: HTTP ${resp.status}`)
        })
      }
      return resp.json()
    })
  }))
}

function esBulkInsert (context, records) {
  const {
    debug,
    logger,
    url
  } = context

  const body = records.map(i => JSON.stringify(i)).join('\n') + '\n'
  return fetch(url + '/_bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
    .then(resp => {
      if (resp.status !== 200) {
        return resp.json().then(data => {
          throw new Error(`Error inserting metrics: HTTP ${resp.status}: ${JSON.stringify(data)}`)
        }, () => {
          throw new Error(`Error inserting metrics: HTTP ${resp.status}`)
        })
      }
      return resp.json()
    })
    .then((data) => {
      elasticStats.inserts++
      if (debug) {
        logger.log(`Inserted ${records.length / 2} records into elasticsearch`)
      }
    }, error => {
      elasticStats.errors++
      logger.log(error.message, 'ERROR')
    })
}

const dateFormatters = {
  hour: (ms) => `${new Date(ms).toISOString().slice(0, 13)}`,
  day: (ms) => `${new Date(ms).toISOString().slice(0, 10)}`,
  month: (ms) => `${new Date(ms).toISOString().slice(0, 7)}`
}

const flushStats = (context) => (ts, metrics) => {
  const { logger, debug } = context
  const records = generateRecords(context, ts, metrics)

  if (debug) {
    logger.log('flushing ' + records.length / 2 + ' stats to ES')
  }
  esBulkInsert(context, records)
}

const generateRecords = (context, ts, metrics) => {
  const timeStamp = ts * 1000
  elasticStats.lastFlush = timeStamp
  const {
    indexPrefix,
    indexTimestamp,
    counterIndexName,
    timerIndexName,
    gaugeIndexName,
    setIndexName
  } = context

  const indexTimeStampValue = dateFormatters[indexTimestamp](timeStamp)

  const { counters, timer_counters: timerCounter, gauges, timer_data: timerData, sets } = metrics
  const records = []
  const queueRecord = (indexName, record) => {
    elasticStats.metricCount++
    records.push({
      index: {
        _index: `${indexPrefix}${indexName}_${indexTimeStampValue}`,
        _type: '_doc'
      }
    })
    records.push(record)
  }

  for (const metric of Object.keys(counters)) {
    queueRecord(counterIndexName, {
      '@timestamp': timeStamp,
      metric,
      value: counters[metric]
    })
  }

  for (const metric of Object.keys(timerCounter)) {
    queueRecord(counterIndexName, {
      '@timestamp': timeStamp,
      metric,
      value: timerCounter[metric]
    })
  }

  for (const metric of Object.keys(gauges)) {
    queueRecord(gaugeIndexName, {
      '@timestamp': timeStamp,
      metric,
      value: gauges[metric]
    })
  }

  for (const metric of Object.keys(timerData)) {
    const record = Object.assign({
      '@timestamp': timeStamp,
      metric
    }, timerData[metric])
    queueRecord(timerIndexName, record)
  }

  for (const metric of Object.keys(sets)) {
    queueRecord(setIndexName, {
      '@timestamp': timeStamp,
      metric,
      value: sets[metric].store
    })
  }
  return records
}

const elasticBackendStatus = () => function (writeCb) {
  elasticStats.statusCalls++
  for (const stat of Object.keys(elasticStats)) {
    writeCb(null, 'elasticsearch', stat, elasticStats[stat])
  }
}

module.exports.init = function (startupTime, config, events, logger) {
  const { debug, elasticsearch } = config

  const {
    url = 'http://localhost:9200/',
    indexPrefix = 'statsd_',
    indexTimestamp = 'day', // month | hour
    counterIndexName = 'counter',
    timerIndexName = 'timer',
    gaugeIndexName = 'gauge',
    setIndexName = 'set',
    counterTemplate = templates.counterTemplate(`${indexPrefix}${counterIndexName}*`),
    timerTemplate = templates.timerTemplate(`${indexPrefix}${timerIndexName}*`),
    gaugeTemplate = templates.gaugeTemplate(`${indexPrefix}${gaugeIndexName}*`),
    setTemplate = templates.setTemplate(`${indexPrefix}${setIndexName}*`)
  } = elasticsearch || {}

  const context = {
    debug,
    logger,
    url,
    indexPrefix,
    indexTimestamp,
    counterIndexName,
    timerIndexName,
    gaugeIndexName,
    setIndexName
  }

  if (debug) {
    logger.log('Elasticsearch backend loading', 'INFO')
  }

  ensureTemplates(context, { counterTemplate, timerTemplate, gaugeTemplate, setTemplate }).then(
    () => {
      logger.log('Elasticsearch templates loaded', 'INFO')
      events.on('flush', flushStats(context))
      events.on('status', elasticBackendStatus(context))
    },
    err => {
      logger.log('Elasticsearch backend failure: unable to ensure index templates', 'ERROR')
      logger.log(err.message, 'ERROR')
    }
  )

  return true
}
