import d3 from 'd3';
import { builtIn as builtInEvaluator } from './eval';
import polyline from '../graph-types/polyline';
import datumDefaults from '../datum-defaults';
// var builtInEvaluator = require('./eval').builtIn
// var polyline = require('../graph-types/polyline').default
// var datumDefaults = require('../datum-defaults')

export default chart => {
  const derivativeDatum = datumDefaults({
    isHelper: true,
    skipTip: true,
    skipBoundsCheck: true,
    nSamples: 2,
    graphType: 'polyline'
  })

  const computeLine = d => {
    if (!d.derivative) {
      return []
    }
    const x0 = typeof d.derivative.x0 === 'number' ? d.derivative.x0 : Infinity
    derivativeDatum.index = d.index
    derivativeDatum.scope = {
      m: builtInEvaluator(d.derivative, 'fn', {x: x0}),
      x0: x0,
      y0: builtInEvaluator(d, 'fn', {x: x0})
    }
    derivativeDatum.fn = 'm * (x - x0) + y0'
    return [derivativeDatum]
  }

  const checkAutoUpdate = d => {
    if (!d.derivative) {
      return
    }
    if (d.derivative.updateOnMouseMove && !d.derivative.$$mouseListener) {
      d.derivative.$$mouseListener = x0 => {
        // update initial value to be the position of the mouse
        // scope's x0 will be updated on the next call to `derivative(self)`
        if (d.derivative) {
          d.derivative.x0 = x0
        }
        // trigger update (selection = self)
        derivative(this)
      }
      // if d.derivative is destroyed and recreated, the tip:update event
      // will be fired on the new d.derivative :)
      chart.on('tip:update', d.derivative.$$mouseListener)
    }
  }

  const derivative = function (selection) {
    selection.each(function (d) {
      const el = d3.select(this)
      const data = computeLine.call(selection, d)
      checkAutoUpdate.call(selection, d)
      const innerSelection = el.selectAll('g.derivative')
        .data(data)

      innerSelection.enter()
        .append('g')
        .attr('class', 'derivative')

      // enter + update
      innerSelection
        .call(polyline(chart))

      // update
      // change the opacity of the line
      innerSelection.selectAll('path')
        .attr('opacity', 0.5)

      innerSelection.exit().remove()
    })
  }

  return derivative
}
