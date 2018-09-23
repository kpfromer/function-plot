import d3 from 'd3';
import pressed from 'key-pressed';
import keydown from 'keydown';
import integrateSimpson from 'integrate-adaptive-simpson';
// var d3 = window.d3
// var extend = require('extend')
// var pressed = require('key-pressed')
// var keydown = require('keydown')
// var integrateSimpson = require('integrate-adaptive-simpson')
export default options => {
  options = {
    key: '<shift>',
    // true to make the brush mask visible/hidden on keydown
    // by default the mask will be visible only when the `key`
    // combination is pressed
    toggle: false,
    ...options
  };

  const brush = d3.svg.brush()
  const kd = keydown(options.key)
  const visible = false
  let cachedInstance

  // the integrator module requires a function with a single parameter x
  const wrapper = datum => x => {
    const functionPlot = window.functionPlot
    return functionPlot.eval.builtIn(datum, 'fn', {x: x})
  }

  const setBrushState = visible => {
    const brushEl = cachedInstance.canvas.selectAll('.definite-integral')
    brushEl.style('display', visible ? null : 'none')
  }

  function inner (instance) {
    cachedInstance = instance
    // update the brush scale with the instance scale
    const oldDisableZoom
    brush
      .x(instance.meta.xScale)
      .on('brushstart', () => {
        if (!d3.event.sourceEvent) return
        oldDisableZoom = !!instance.options.disableZoom
        instance.options.disableZoom = true
        // replot the samples with the option disableZoom set to true
        instance.emit('draw')
      })
      .on('brushend', () => {
        if (!d3.event.sourceEvent) return
        instance.options.disableZoom = oldDisableZoom

        if (!brush.empty()) {
          const a = brush.extent()[0]
          const b = brush.extent()[1]
          // iterate the data finding the value of the definite integral
          // with bounds `a` and `b`
          instance.options.data.forEach((datum, i) => {
            const value = integrateSimpson(wrapper(datum), a, b, options.tol, options.maxdepth)
            instance.emit('definite-integral', datum, i, value, a, b)
          })
        }
        // replot the samples with the option disableZoom set to whatever it was before
        instance.draw()
      })
    var brushEl = instance.canvas.append('g').attr('class', 'brush definite-integral')
    brushEl
      .call(brush)
      .call(brush.event)

    instance.canvas.selectAll('.brush .extent')
      .attr('stroke', '#fff')
      .attr('fill-opacity', 0.125)
      .attr('shape-rendering', 'crispEdges')

    brushEl.selectAll('rect')
      .attr('height', instance.meta.height)

    instance.canvas
      .on('mousemove.definiteIntegral', () => {
        // options.toggle sets the mask visibility when all the required
        // are pressed once and it's not disabled on keyup
        if (!options.toggle) {
          inner.visible(pressed(options.key))
        }
      })
    kd.on('pressed', () => inner.visible(options.toggle ? !inner.visible() : true))
    inner.visible(false)
  }

  inner.visible = function (_) {
    if (!arguments.length) {
      return visible
    }
    visible = _
    setBrushState(_)
    return inner
  }

  return inner
}
