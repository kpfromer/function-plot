import linspace from 'linspace';
import logspace from 'logspace';
import log10 from 'log10';
import globals from './globals';

export const isValidNumber = value => 
  typeof value === 'number' && !isNaN(value);

export const space = (chart, range, n) => {
  const lo = range[0]
  const hi = range[1]
  if (chart.options.xAxis.type === 'log') {
    return logspace(log10(lo), log10(hi), n)
  }
  // default is linear
  return linspace(lo, hi, n)
}

export const getterSetter = function (config, option) { // TODO: work on
  const me = this
  this[option] = function (value) {
    if (!arguments.length) {
      return config[option]
    }
    config[option] = value
    return me
  }
};

export const sgn = value => {
  if (value < 0) { return -1 }
  if (value > 0) { return 1 }
  return 0
};

export const color = (data, index) => 
  data.color || globals.COLORS[index]