import d3 from 'd3';
import evaluate from '../evaluate';
import * as utils from '../utils';
// var d3 = window.d3
// var evaluate = require('../evaluate')
// var utils = require('../utils')

export default chart => {
  const xScale = chart.meta.xScale
  const yScale = chart.meta.yScale

  const scatter = selection => {
    selection.each(function (d) {
      const index = d.index
      const color = utils.color(d, index)
      const evaluatedData = evaluate(chart, d)

      // scatter doesn't need groups, therefore each group is
      // flattened into a single array
      const joined = []
      evaluatedData.forEach(
        array => array.forEach(
          value => joined.push(value)
        )
      );

      const innerSelection = d3.select(this).selectAll(':scope > circle')
        .data(joined)

      innerSelection.enter()
        .append('circle')

      innerSelection
        .attr('fill', d3.hsl(color.toString()).brighter(1.5))
        .attr('stroke', color)
        .attr('opacity', 0.7)
        .attr('r', 1)
        .attr('cx', function (d) { return xScale(d[0]) })
        .attr('cy', function (d) { return yScale(d[1]) })
        .attr(d.attr)

      innerSelection.exit().remove()
    })
  }

  return scatter
}
