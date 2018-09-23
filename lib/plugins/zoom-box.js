import d3 from 'd3';
import pressed from 'key-pressed';
import keydown from 'keydown';

export default options => {
  options = {
    key: '<shift>',
    toggle: false,
    ...options
  };

  const brush = d3.svg.brush()
  const kd = keydown(options.key)
  let cachedInstance
  const visible = false

  const setBrushState = visible => {
    const brushEl = cachedInstance.canvas.selectAll('.zoom-box')
    brushEl.style('display', visible ? null : 'none')
  }

  // TODO: work on
  function inner (instance) {
    cachedInstance = instance
    // update the brush scale with the instance scale
    const oldDisableZoom
    brush
      .x(instance.meta.xScale)
      .y(instance.meta.yScale)
      .on('brushstart', function () {
        if (!d3.event.sourceEvent) return
        oldDisableZoom = !!instance.options.disableZoom
        instance.options.disableZoom = true
        // redrawing the canvas with the option disableZoom set to true
        instance.draw()
      })
      .on('brushend', function () {
        if (!d3.event.sourceEvent) return
        instance.options.disableZoom = oldDisableZoom

        if (!brush.empty()) {
          const lo = brush.extent()[0]
          const hi = brush.extent()[1]
          const x = [lo[0], hi[0]]
          const y = [lo[1], hi[1]]
          instance.programmaticZoom(x, y)
        }
        d3.select(this)
          .transition()
          .duration(1)
          .call(brush.clear())
          .call(brush.event)
      })
    const brushEl = instance.canvas.append('g').attr('class', 'brush zoom-box')
    brushEl
      .call(brush)
      .call(brush.event)

    instance.canvas.selectAll('.brush .extent')
      .attr('stroke', '#fff')
      .attr('fill-opacity', 0.125)
      .attr('shape-rendering', 'crispEdges')

    instance.canvas
      .on('mousemove.zoombox', () => {
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
