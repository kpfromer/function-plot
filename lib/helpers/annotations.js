/**
 * Created by mauricio on 3/29/15.
 */
import d3 from 'd3';

export default function (options) {
  const xScale = options.owner.meta.xScale
  const yScale = options.owner.meta.yScale

  const line = d3.svg.line()
    .x(d => d[0])
    .y(d => d[1])

  const annotations = parentSelection => {
    parentSelection.each(function () {
      // join
      const current = d3.select(this)
      const selection = current.selectAll('g.annotations')
        .data(d => d.annotations || [])

      // enter
      selection.enter()
        .append('g')
        .attr('class', 'annotations')

      // enter + update
      // - path
      const yRange = yScale.range()
      const xRange = xScale.range()
      var path = selection.selectAll('path')
        .data(d => {
          if (d.hasOwnProperty('x')) {
            return [ [[0, yRange[0]], [0, yRange[1]]] ]
          } else {
            return [ [[xRange[0], 0], [xRange[1], 0]] ]
          }
        })
      path.enter()
        .append('path')
        .attr('stroke', '#eee')
        .attr('d', line)
      path.exit().remove()

      // enter + update
      // - text
      var text = selection.selectAll('text')
        .data(d => 
          [{
            text: d.text || '',
            hasX: d.hasOwnProperty('x')
          }]  
        )
      text.enter()
        .append('text')
        .attr('y', d => d.hasX ? 3 : 0)
        .attr('x', d => d.hasX ? 0 : 3)
        .attr('dy', d => d.hasX ? 5 : -5)
        .attr('text-anchor', d => d.hasX ? 'end' : '')
        .attr('transform', d => d.hasX ? 'rotate(-90)' : '')
        .text(d => d.text)
      text.exit().remove()

      // enter + update
      // move group
      selection
        .attr('transform', d => {
          if (d.hasOwnProperty('x')) {
            return 'translate(' + xScale(d.x) + ', 0)'
          } else {
            return 'translate(0, ' + yScale(d.y) + ')'
          }
        })

      // exit
      selection.exit()
        .remove()
    })
  }

  return annotations
}
