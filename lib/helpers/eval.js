import intervalEval from 'interval-arithmetic-eval';
import builtInEval from 'built-in-math-eval';
const samplers = {
  interval: intervalEval,
  builtIn: builtInEval
};

// window.math && (samplers.builtIn = window.math.compile)

const generateEvaluator = samplerName => {
  const doCompile = expression => {
    if (typeof expression === 'string') {
      const compile = samplers[samplerName]
      return compile(expression)
    } else if (typeof expression === 'function') {
      return { eval: expression }
    } else {
      throw Error('expression must be a string or a function')
    }
  }

  const compileIfPossible = (meta, property) => {
    // compile the function using interval arithmetic, cache the result
    // so that multiple calls with the same argument don't trigger the
    // kinda expensive compilation process
    const expression = meta[property]
    const hiddenProperty = samplerName + '_Expression_' + property
    const hiddenCompiled = samplerName + '_Compiled_' + property
    if (expression !== meta[hiddenProperty]) {
      meta[hiddenProperty] = expression
      meta[hiddenCompiled] = doCompile(expression)
    }
  }

  function getCompiledExpression (meta, property) {
    return meta[samplerName + '_Compiled_' + property]
  }

  /**
   * Evaluates meta[property] with `variables`
   *
   * - Compiles meta[property] if it wasn't compiled already (also with cache
   *   check)
   * - Evaluates the resulting function with the merge of meta.scope and
   *   `variables`
   *
   * @param {Object} meta
   * @param {String} property
   * @param {Object} variables
   * @returns {Number|Array} The builtIn evaluator returns a number, the
   * interval evaluator an array
   */
  function evaluate (meta, property, variables) {
    // e.g.
    //
    //  meta: {
    //    fn: 'x + 3',
    //    scope: { y: 3 }
    //  }
    //  property: 'fn'
    //  variables:  { x: 3 }
    //
    compileIfPossible(meta, property)

    return getCompiledExpression(meta, property).eval(
      {
        ...meta.scope,
        ...variables
      }
    )
  }

  return evaluate
}

export const builtIn = generateEvaluator('builtIn')
export const interval = generateEvaluator('interval')