import d3 from 'd3';
const Globals = {
  COLORS: [
    'steelblue',
    'red',
    '#05b378',      // green
    'orange',
    '#4040e8',      // purple
    'yellow',
    'brown',
    'magenta',
    'cyan'
  ].map(color => d3.hsl(color)),
  DEFAULT_WIDTH: 550,
  DEFAULT_HEIGHT: 350,
  TIP_X_EPS: 1,
  DEFAULT_ITERATIONS: null
}
Globals.MAX_ITERATIONS = Globals.DEFAULT_WIDTH * 4
export default Globals;