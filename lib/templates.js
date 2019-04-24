const settings = {
  analysis: {
    analyzer: {
      metricAnalyzer: {
        type: 'standard',
        filter: 'lowercase',
        tokenizer: 'split_dots'
      }
    },
    tokenizer: {
      split_dots: {
        type: 'simple_pattern_split',
        pattern: '.'
      }
    }
  }
}

const metric = {
  type: 'keyword'
  // fields: {
  //   search: {
  //     analyzer: 'metricAnalyzer',
  //     type: 'text'
  //   }
  // }
}

function counterTemplate (indexPattern) {
  return {
    index_patterns: [indexPattern],
    settings,
    mappings: {
      _doc: {
        _source: { enabled: true },
        dynamic: false,
        properties: {
          '@timestamp': {
            type: 'date'
          },
          metric,
          value: {
            type: 'long'
          }
        }
      }
    }
  }
}

function timerTemplate (indexPattern) {
  return {
    index_patterns: [indexPattern],
    settings,
    mappings: {
      _doc: {
        _source: { enabled: true },
        dynamic: false,
        properties: {
          '@timestamp': {
            type: 'date'
          },
          metric,
          // timer fields
          count_90: {
            type: 'long'
          },
          count_ps: {
            type: 'long'
          },
          count: {
            type: 'long'
          },
          lower: {
            type: 'float'
          },
          mean_90: {
            type: 'float'
          },
          mean: {
            type: 'float'
          },
          median: {
            type: 'float'
          },
          std: {
            type: 'float'
          },
          sum_90: {
            type: 'float'
          },
          sum_squares_90: {
            type: 'float'
          },
          sum_squares: {
            type: 'float'
          },
          sum: {
            type: 'float'
          },
          upper_90: {
            type: 'float'
          },
          upper: {
            type: 'float'
          }
        }
      }
    }
  }
}

function gaugeTemplate (indexPattern) {
  return {
    index_patterns: [indexPattern],
    settings,
    mappings: {
      _doc: {
        _source: { enabled: true },
        dynamic: false,
        properties: {
          '@timestamp': {
            type: 'date'
          },
          metric,
          value: {
            type: 'long'
          }
        }
      }
    }
  }
}

function setTemplate (indexPattern) {
  return {
    index_patterns: [indexPattern],
    settings,
    mappings: {
      _doc: {
        _source: { enabled: true },
        dynamic: false,
        properties: {
          '@timestamp': {
            type: 'date'
          },
          metric,
          value: {
            type: 'object',
            dynamic: true,
            enabled: false,
            properties: {}
          }
        }
      }
    }
  }
}

module.exports = {
  counterTemplate,
  timerTemplate,
  gaugeTemplate,
  setTemplate
}
