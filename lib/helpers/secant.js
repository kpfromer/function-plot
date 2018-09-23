import d3 from 'd3';

import { builtIn as builtInEvaluator } from './eval';
import datumDefaults from '../datum-defaults';
import polyline from '../graph-types/polyline'; 

export default chart => {
  const secantDefaults = datumDefaults({
    isHelper: true,
    skipTip: true,
    skipBoundsCheck: true,
    nSamples: 2,
    graphType: 'polyline'
  })

  const computeSlope = scope => 
    scope.m = (scope.y1 - scope.y0) / (scope.x1 - scope.x0)

  const updateLine = (d, secant) => {
    if (!secant.hasOwnProperty('x0')) {
      throw Error('secant must have the property `x0` defined')
    }
    secant.scope = secant.scope || {}

    const x0 = secant.x0
    const x1 = typeof secant.x1 === 'number' ? secant.x1 : Infinity
    secant.scope = {
      ...secant.scope,
      x0: x0,
      x1: x1,
      y0: builtInEvaluator(d, 'fn', {x: x0}),
      y1: builtInEvaluator(d, 'fn', {x: x1})
    }
    computeSlope(secant.scope)
  }

  const setFn = (d, secant) => {
    updateLine(d, secant)
    secant.fn = 'm * (x - x0) + y0'
  }

  const setMouseListener = function (d, secantObject) {
    if (secantObject.updateOnMouseMove && !secantObject.$$mouseListener) {
      secantObject.$$mouseListener = x1 => {
        secantObject.x1 = x1
        updateLine(d, secantObject)
        secant(this)
      }
      chart.on('tip:update', secantObject.$$mouseListener)
    }
  }

  const computeLines = function (d) {
    const data = []
    d.secants = d.secants || []
    for (let i = 0; i < d.secants.length; i += 1) {
      let secant = d.secants[i] = {...secantDefaults, ...d.secants[i]}
      // necessary to make the secant have the same color as d
      secant.index = d.index
      if (!secant.fn) {
        setFn.call(this, d, secant)
        setMouseListener.call(this, d, secant)
      }
      data.push(secant)
    }
    return data
  }

  const secant = function (selection) {
    selection.each(function (d) {
      var el = d3.select(this)
      var data = computeLines.call(selection, d)
      var innerSelection = el.selectAll('g.secant')
        .data(data)

      innerSelection.enter()
        .append('g')
        .attr('class', 'secant')

      // enter + update
      innerSelection
        .call(polyline(chart))

      // change the opacity of the secants
      innerSelection.selectAll('path')
        .attr('opacity', 0.5)

      // exit
      innerSelection.exit().remove()
    })
  }

  return secant
}
