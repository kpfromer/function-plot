import d3 from 'd3';
import evaluate from '../evaluate';
import * as utils from '../utils';
import clamp from 'clamp';

export default chart => {
  const xScale = chart.meta.xScale
  const yScale = chart.meta.yScale
  const plotLine = selection => {
    selection.each(function (d) {
      const el = plotLine.el = d3.select(this)
      const index = d.index
      const evaluatedData = evaluate(chart, d)
      const color = utils.color(d, index)
      const innerSelection = el.selectAll(':scope > path.line')
        .data(evaluatedData)

      const yRange = yScale.range()
      let yMax = yRange[0] + 1
      let yMin = yRange[1] - 1
      if (d.skipBoundsCheck) {
        yMax = Infinity
        yMin = -Infinity
      }

      const y = d => 
        clamp(yScale(d[1]), yMin, yMax);

      var line = d3.svg.line()
        .interpolate('linear')
        .x(d => xScale(d[0]))
        .y(y)
      var area = d3.svg.area()
        .x(d => xScale(d[0]))
        .y0(yScale(0))
        .y1(y)

      innerSelection.enter()
        .append('path')
        .attr('class', 'line line-' + index)
        .attr('stroke-width', 1)
        .attr('stroke-linecap', 'round')

      // enter + update
      innerSelection
        .each(function () {
          const path = d3.select(this)
          let pathD
          if (d.closed) {
            path.attr('fill', color)
            path.attr('fill-opacity', 0.3)
            pathD = area
          } else {
            path.attr('fill', 'none')
            pathD = line
          }
          path
            .attr('stroke', color)
            .attr('marker-end', () => 
              d.fnType === 'vector'
              ? 'url(#' + chart.markerId + ')'
              : null
            )
            .attr('d', pathD)
        })
        .attr(d.attr)

      innerSelection.exit().remove()
    })
  }

  return plotLine
}
