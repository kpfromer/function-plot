import d3 from 'd3';
import derivative from './derivative';
import secant from './secant';

export default chart => selection =>
  selection.each(function () {
    const el = d3.select(this)
    el.call(derivative(chart))
    el.call(secant(chart))
  })