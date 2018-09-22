import d3 from 'd3';
import evaluate from '../evaluate';
import utils from '../utils'

export default chart => {
  let minWidthHeight
  const xScale = chart.meta.xScale
  const yScale = chart.meta.yScale

  const clampRange = (vLo, vHi, gLo, gHi) => {
    // issue 69
    // by adding the option `invert` to both the xAxis and the `yAxis`
    // it might be possible that after the transformation to canvas space
    // the y limits of the rectangle get inverted i.e. gLo > gHi
    //
    // e.g.
    //
    //   functionPlot({
    //     target: '#playground',
    //     yAxis: { invert: true },
    //     // ...
    //   })
    //
    if (gLo > gHi) {
      const t = gLo
      gLo = gHi
      gHi = t
    }
    const hi = Math.min(vHi, gHi)
    const lo = Math.max(vLo, gLo)
    if (lo > hi) {
      // no overlap
      return [-minWidthHeight, 0]
    }
    return [lo, hi]
  }

  const line = (points, closed) => {
    let path = ''
    const range = yScale.range()
    const minY = Math.min.apply(Math, range)
    const maxY = Math.max.apply(Math, range)
    for (var i = 0, length = points.length; i < length; i += 1) {
      if (points[i]) {
        const x = points[i][0]
        const y = points[i][1]
        let yLo = y.lo
        let yHi = y.hi
        // if options.closed is set to true then one of the bounds must be zero
        if (closed) {
          yLo = Math.min(yLo, 0)
          yHi = Math.max(yHi, 0)
        }
        // points.scaledDX is added because of the stroke-width
        var moveX = xScale(x.lo) + points.scaledDx / 2
        var viewportY = clampRange(
          minY, maxY,
          isFinite(yHi) ? yScale(yHi) : -Infinity,
          isFinite(yLo) ? yScale(yLo) : Infinity
        )
        let vLo = viewportY[0]
        let vHi = viewportY[1]
        path += ' M ' + moveX + ' ' + vLo
        path += ' v ' + Math.max(vHi - vLo, minWidthHeight)
      }
    }
    return path
  }

  const plotLine = selection => {
    selection.each(function (d) {
      const el = plotLine.el = d3.select(this)
      const index = d.index
      const closed = d.closed
      const evaluatedData = evaluate(chart, d)
      const innerSelection = el.selectAll(':scope > path.line')
        .data(evaluatedData)

      // the min height/width of the rects drawn by the path generator
      minWidthHeight = Math.max(evaluatedData[0].scaledDx, 1)

      innerSelection.enter()
        .append('path')
        .attr('class', 'line line-' + index)
        .attr('fill', 'none')

      // enter + update
      innerSelection
        .attr('stroke-width', minWidthHeight)
        .attr('stroke', utils.color(d, index))
        .attr('opacity', closed ? 0.5 : 1)
        .attr('d', d => line(d, closed))
        .attr(d.attr)

      innerSelection.exit().remove()
    })
  }

  return plotLine
}