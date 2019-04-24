# elasticsearch-statsd-backend 🔎

Elasticsearch backend for statsd

## Overview

This backend allows [Statsd][statsd] to save to [Elasticsearch][elasticsearch].  Supports dynamic index creation and custom index templates.

## History

Originally written by Github user rameshpy, this library was created as a feature branch of etsy/statsd. A repository was created as a restructuring of the existing feature branch into a [standalone backend repository](https://github.com/markkimsal/statsd-elasticsearch-backend). This project was then forked and published to npm under `elasticsearch-statsd-backend` with a complete rewrite. You can find the `markkimsal` code at `elasticsearch-statsd-backend@0.4.3` (the previous repo was never published to npm) and this rewrite from v1.0.0 and onward.

## Installation

```
$ npm install elasticsearch-statsd-backend

```

Requires node 6+ which is the highest node statsd supports.

## Configuration

This backend looks for configuration under the `elasticsearch` key in your statsd config file. The default values are below

```js
{
  backends: [ 'elasticsearch-statsd-backend' /*, 'other backends' */],
	// debug: true,
  elasticsearch: {
    url: 'http://localhost:9200/', // The url of your elasticserach server
    indexPrefix:'statsd_' // Prefix of the dynamic index to be created
    indexTimestamp: 'day' // hour | day | month  - timestamp specificity for index naming
    counterIndexName: 'counter',
    timerIndexName: 'timer',
    gaugeIndexName: 'gauge',
    setIndexName: 'set',
    counterTemplate: undefined, // JSON object representing an index template
    timerTemplate: undefined, // JSON object representing an index template
    gaugeTemplate: undefined, // JSON object representing an index template
    setTemplate: undefined, // JSON object representing an index template
	}
}
```

## Indexes
By default index creation will look like this. Indexes are only created if they have data.

- `statsd_counter_2019-04-25`
- `statsd_timer_2019-04-25`
- `statsd_gauge_2019-04-25`
- `statsd_set_2019-04-25`

This is `${indexPrefix}${typeIndexName}_${indexTimestamp}`. The `indexTimestamp` will use more or less of an UTC ISO string depending on your needs. eg;

- `hour` looks like `2019-04-25T16`
- `day` looks like `2019-04-25`
- `months` looks like `2019-04`

## Templates
The default templates use your configuration data to match index created with your prefix and type names. If you supply your own template you'll have to do that manually.

Every index has three fields that are the same.

- `@timestamp` which is a `date`
- `metric` which is a `text` with custom analyser to allow lowercase `*` searches
- `metric.raw` field as type `keyword`

Timers have a field for every calculated metric, counters, and gauges have a `value` which is a `long` type. Sets have a dynamic `value` field which is an `object`.

You can see `/lib/templates.js` for more details.

## Contributors wanted!

This library was developed at Bustle. However writing docs and code is a lot of work! Thank you in advance for helping out and keeping projects like this open source.
