import d3 from 'd3';
import events from 'events';
import mousetip from './tip';
import helpers from './helpers';
import annotations from './helpers/annotations';
import datumDefaults from './datum-defaults';

let globals = require('./globals')
let graphTypes = require('./graph-types/').default;
let cache = []

export const create = options => {
  // options = options || {}
  options.data = options.data || []

  // globals
  let width;
  let height;
  let margin;
  let zoomBehavior;
  let xScale, yScale;
  const line = d3.svg.line()
    .x(d => xScale(d[0]))
    .y(d => yScale(d[1]));

  class Chart extends events {
    constructor() {
      super();
      const n = Math.random()
      const letter = String.fromCharCode(Math.floor(n * 26) + 97);
      this.id = options.id = letter + n.toString(16).substr(2);
      this.linkedGraphs = [this];
      this.options = options;
      cache[this.id] = this;
      this.setUpEventListeners();
    }
  
    build() {
      this.internalVars()
      this.drawGraphWrapper()
      return this
    }
  
    initializeAxes() {
      const integerFormat = d3.format('s');
      const format = scale => d => {
        const decimalFormat = scale.tickFormat(10)
        const isInteger = d === +d && d === (d | 0)
        // integers: d3.format('s'), see https://github.com/mbostock/d3/wiki/Formatting
        // decimals: default d3.scale.linear() formatting see
        //    https://github.com/mbostock/d3/blob/master/src/svg/axis.js#L29
        return isInteger ? integerFormat(d) : decimalFormat(d)
      }
    
      const computeYScale = xScale => {
        // assumes that xScale is a linear scale
        const xDiff = xScale[1] - xScale[0]
        return height * xDiff / width
      }
    
      options.xAxis = options.xAxis || {}
      options.xAxis.type = options.xAxis.type || 'linear'
    
      options.yAxis = options.yAxis || {}
      options.yAxis.type = options.yAxis.type || 'linear'
  
      const createXDomain = axis => {
        if (axis.domain) {
          return axis.domain
        }
        if (axis.type === 'linear') {
          var xLimit = 12
          return [-xLimit / 2, xLimit / 2]
        } else if (axis.type === 'log') {
          return [1, 10]
        }
        throw Error('axis type ' + axis.type + ' unsupported')
      }
    
      const xDomain = this.meta.xDomain = createXDomain(options.xAxis);
  
      const createYDomain = axis => {
        if (axis.domain) {
          return axis.domain
        }
        const yLimit = computeYScale(xDomain)
        if (axis.type === 'linear') {
          return [-yLimit / 2, yLimit / 2]
        } else if (axis.type === 'log') {
          return [1, 10]
        }
        throw Error('axis type ' + axis.type + ' unsupported')
      }
    
      const yDomain = this.meta.yDomain = createYDomain(options.yAxis)
    
      if (xDomain[0] >= xDomain[1]) {
        throw Error('the pair defining the x-domain is inverted')
      }
      if (yDomain[0] >= yDomain[1]) {
        throw Error('the pair defining the y-domain is inverted')
      }
    
      xScale = this.meta.xScale = d3.scale[options.xAxis.type]()
        .domain(xDomain)
        .range(options.xAxis.invert ? [width, 0] : [0, width])
      yScale = this.meta.yScale = d3.scale[options.yAxis.type]()
        .domain(yDomain)
        .range(options.yAxis.invert ? [0, height] : [height, 0])
      this.meta.xAxis = d3.svg.axis()
        .scale(xScale)
        .tickSize(options.grid ? -height : 0)
        .tickFormat(format(xScale))
        .orient('bottom')
      this.meta.yAxis = d3.svg.axis()
        .scale(yScale)
        .tickSize(options.grid ? -width : 0)
        .tickFormat(format(yScale))
        .orient('left')
    }
  
    internalVars() {
      // measurements and other derived data
      this.meta = {}
    
      margin = this.meta.margin = {left: 30, right: 30, top: 20, bottom: 20}
      // margin = this.meta.margin = {left: 0, right: 0, top: 20, bottom: 20}
      // if there's a title make the top margin bigger
      if (options.title) {
        this.meta.margin.top = 40
      }
    
      zoomBehavior = this.meta.zoomBehavior = d3.behavior.zoom()
    
      // inner width/height
      width = this.meta.width = (options.width || globals.DEFAULT_WIDTH) -
        margin.left - margin.right
      height = this.meta.height = (options.height || globals.DEFAULT_HEIGHT) -
        margin.top - margin.bottom
    
      this.initializeAxes()
    }
  
    drawGraphWrapper() {
      const root = this.root = d3.select(options.target).selectAll('svg')
        .data([options])
    
      // enter
      this.root.enter = root.enter()
        .append('svg')
        .attr('class', 'function-plot')
        .attr('font-size', this.getFontSize())
    
      // merge
      root
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
    
      this.buildTitle()
      this.buildLegend()
      this.buildCanvas()
      this.buildClip()
      this.buildAxis()
      this.buildAxisLabel()
    
      // draw each datum after the wrapper was set up
      this.draw()
    
      // helper to detect the closest fn to the cursor's current abscissa
      const tip = this.tip = mousetip({ 
        ...options.tip,
        owner: this
      })
      this.canvas
        .call(tip)
    
      this.buildZoomHelper()
      this.setUpPlugins()
    }
  
    buildTitle() {
      // join
      const selection = this.root.selectAll('text.title')
        .data(d => [d.title].filter(Boolean));
    
      // enter
      selection.enter()
        .append('text')
        .attr('class', 'title')
        .attr('y', margin.top / 2)
        .attr('x', margin.left + width / 2)
        .attr('font-size', 25)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .text(options.title)
    
      // exit
      selection.exit().remove()
    }
  
    buildLegend() {
      // enter
      this.root.enter
        .append('text')
        .attr('class', 'top-right-legend')
        .attr('text-anchor', 'end')
    
      // update + enter
      this.root.select('.top-right-legend')
        .attr('y', margin.top / 2)
        .attr('x', width + margin.left)
    }
  
    buildCanvas() {
      this.meta.zoomBehavior
        .x(xScale)
        .y(yScale)
        .on('zoom', () => this.emit('all:zoom', d3.event.translate, d3.event.scale));
    
      // enter
      var canvas = this.canvas = this.root
        .selectAll('.canvas')
        .data(function (d) { return [d] })
    
      this.canvas.enter = canvas.enter()
        .append('g')
        .attr('class', 'canvas')
    }
  
    buildClip() {
      // (so that the functions don't overflow on zoom or drag)
      const id = this.id
      const defs = this.canvas.enter.append('defs')
      defs.append('clipPath')
        .attr('id', 'function-plot-clip-' + id)
        .append('rect')
        .attr('class', 'clip static-clip')
    
      // enter + update
      this.canvas.selectAll('.clip')
        .attr('width', width)
        .attr('height', height)
    
      // marker clip (for vectors)
      this.markerId = this.id + '-marker'
      defs.append('clipPath')
        .append('marker')
        .attr('id', this.markerId)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5L0,0')
        .attr('stroke-width', '0px')
        .attr('fill-opacity', 1)
        .attr('fill', '#777')
    }
  
    buildAxis() {
      // axis creation
      var canvasEnter = this.canvas.enter
      canvasEnter.append('g')
        .attr('class', 'x axis')
      canvasEnter.append('g')
        .attr('class', 'y axis')
    
      // update
      this.canvas.select('.x.axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(this.meta.xAxis)
      this.canvas.select('.y.axis')
        .call(this.meta.yAxis)
    
    }
  
    buildAxisLabel() {
      // axis labeling
      let xLabel, yLabel
      const canvas = this.canvas
    
      xLabel = canvas.selectAll('text.x.axis-label')
        .data(d => [d.xAxis.label].filter(Boolean))
      xLabel.enter()
        .append('text')
        .attr('class', 'x axis-label')
        .attr('text-anchor', 'end')
      xLabel
        .attr('x', width)
        .attr('y', height - 6)
        .text(d => d)
      xLabel.exit().remove()
    
      yLabel = canvas.selectAll('text.y.axis-label')
        .data(d => [d.yAxis.label].filter(Boolean))
      yLabel.enter()
        .append('text')
        .attr('class', 'y axis-label')
        .attr('y', 6)
        .attr('dy', '.75em')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-90)')
      yLabel
        .text(d => d)
      yLabel.exit().remove()
    }
  
    buildContent() {
      var self = this
      const canvas = this.canvas
    
      
      canvas
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(zoomBehavior)
        .each(() => {
          const el = d3.select(this) // TODO: FIX!
          // make a copy of all the listeners available to be removed/added later
          const listeners = [
            'mousedown',
            'touchstart',
            ('onwheel' in document ?
              'wheel' : 'ononmousewheel' in document ?
              'mousewheel' :
              'MozMousePixelScroll')
          ].map(d => `${d}.zoom`)
          if (!el._zoomListenersCache) {
            listeners.forEach(l => el['_' + l] = el.on(l))
            el._zoomListenersCache = true
          }
          const setState = state => {
            listeners.forEach(l => state ? el.on(l, el['_' + l]) : el.on(l, null))
          }
          setState(!options.disableZoom)
        })
    
      const content = this.content = canvas.selectAll(':scope > g.content')
        .data(d => [d])
    
      // g tag clipped to hold the data
      content.enter()
        .append('g')
        .attr('clip-path', 'url(#function-plot-clip-' + this.id + ')')
        .attr('class', 'content')
    
      // helper line, x = 0
      if (options.xAxis.type === 'linear') {
        const yOrigin = content.selectAll(':scope > path.y.origin')
        .data([ [[0, yScale.domain()[0]], [0, yScale.domain()[1]]] ])
        yOrigin.enter()
        .append('path')
        .attr('class', 'y origin')
        .attr('stroke', 'black')
        .attr('opacity', 0.2)
        yOrigin.attr('d', line)
      }
    
      // helper line y = 0
      if (options.yAxis.type === 'linear') {
        const xOrigin = content.selectAll(':scope > path.x.origin')
          .data([ [[xScale.domain()[0], 0], [xScale.domain()[1], 0]] ])
        xOrigin.enter()
          .append('path')
          .attr('class', 'x origin')
          .attr('stroke', 'black')
          .attr('opacity', 0.2)
        xOrigin.attr('d', line)
      }
    
      // annotations
      content
        .call(annotations({ owner: self }))
    
      // content construction
      // - join options.data to <g class='graph'> elements
      // - for each datum determine the sampler to use
      const graphs = content.selectAll(':scope > g.graph')
        .data(d => d.data.map(datumDefaults))
    
      // enter
      graphs
        .enter()
        .append('g')
        .attr('class', 'graph')
    
      // enter + update
      // d3 each needs to be a function to get the selector via this
      graphs
        .each(function (d, index, j) {
          // additional options needed in the graph-types/helpers
          d.index = index
          
          d3.select(this)
            .call(graphTypes[d.graphType](self))
          d3.select(this)
            .call(helpers(self))
        })
    }
  
    buildZoomHelper() {
      // dummy rect (detects the zoom + drag)
    
      // enter
      this.draggable = this.canvas.enter
        .append('rect')
        .attr('class', 'zoom-and-drag')
        .style('fill', 'none')
        .style('pointer-events', 'all')
    
      // update
      this.canvas.select('.zoom-and-drag')
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', () => this.emit('all:mouseover'))
        .on('mouseout', () => this.emit('all:mouseout'))
        .on('mousemove', () => this.emit('all:mousemove'))
    }
  
    setUpPlugins() {
      const plugins = options.plugins || []
      plugins.forEach(plugin => plugin(this))
    }
  
    addLink(...args) {
      args.forEach(argument => this.linkedGraphs.push(argument))
    }
  
    updateAxes() { // TODO: work on
      var instance = this
      var canvas = instance.canvas
      canvas.select('.x.axis').call(instance.meta.xAxis)
      canvas.select('.y.axis').call(instance.meta.yAxis)
    
      // updates the style of the axes
      canvas.selectAll('.axis path, .axis line')
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('shape-rendering', 'crispedges')
        .attr('opacity', 0.1)
    }
  
    syncOptions() {
      // update the original options yDomain and xDomain
      this.options.xAxis.domain = this.meta.xScale.domain()
      this.options.yAxis.domain = this.meta.yScale.domain()
    }
  
    programmaticZoom(xDomain, yDomain) {
      d3.transition()
        .duration(750)
        .tween('zoom', () => {
          const ix = d3.interpolate(xScale.domain(), xDomain)
          const iy = d3.interpolate(yScale.domain(), yDomain)
          return t => {
            zoomBehavior
              .x(xScale.domain(ix(t)))
              .y(yScale.domain(iy(t)))
            instance.draw()
          }
        })
        .each('end', () => this.emit('programmatic-zoom'))
    }
  
    getFontSize() {
      return Math.max(Math.max(width, height) / 50, 8)
    }
  
    draw() {
      var instance = this
      instance.emit('before:draw')
      instance.syncOptions()
      instance.updateAxes()
      instance.buildContent()
      instance.emit('after:draw')
    }
  
    setUpEventListeners() {
      var instance = this
    
      var events = {
        mousemove: coordinates => instance.tip.move(coordinates),
    
        mouseover: () => instance.tip.show(),
    
        mouseout: () => instance.tip.hide(),
    
        zoom: (translate, scale) => {
          zoomBehavior
            .translate(translate)
            .scale(scale)
        },
    
        'tip:update': (x, y, index) => {
          const meta = instance.root.datum().data[index]
          const title = meta.title || ''
          const format = meta.renderer || ((x, y) =>
            x.toFixed(3) + ', ' + y.toFixed(3));
    
          const text = []
          title && text.push(title)
          text.push(format(x, y))
    
          instance.root.select('.top-right-legend')
            .attr('fill', globals.COLORS[index])
            .text(text.join(' '))
        }
    
      }
    
      var all = {
        mousemove: () => {
          const mouse = d3.mouse(instance.root.select('rect.zoom-and-drag').node())
          const coordinates = {
            x: xScale.invert(mouse[0]),
            y: yScale.invert(mouse[1])
          }
          instance.linkedGraphs.forEach(graph => {
            graph.emit('before:mousemove', coordinates)
            graph.emit('mousemove', coordinates)
          })
        },
    
        zoom: (translate, scale) => {
          instance.linkedGraphs.forEach(graph => {
            graph.emit('zoom', translate, scale)
            graph.draw()
          })
    
          // emit the position of the mouse to all the registered graphs
          instance.emit('all:mousemove')
        }
      }
    
      Object.keys(events).forEach(e => {
        instance.on(e, events[e])
        // create an event for each event existing on `events` in the form 'all:' event
        // e.g. all:mouseover all:mouseout
        // the objective is that all the linked graphs receive the same event as the current graph
        !all[e] && instance.on('all:' + e, function () {
          var args = Array.prototype.slice.call(arguments)
          instance.linkedGraphs.forEach(graph => {
            const localArgs = args.slice()
            localArgs.unshift(e)
            graph.emit.apply(graph, localArgs)
          })
        })
      })
    
      Object.keys(all).forEach(e => 
        instance.on('all:' + e, all[e])
      )
    }  
  
  }

  let instance = cache[options.id]
  if (!instance) {
    instance = new Chart()
  }
  return instance.build()
}
