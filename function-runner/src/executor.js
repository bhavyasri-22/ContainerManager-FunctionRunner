class Executor {
  execute(code, input) {
    try {
      const func = new Function('input', code);
      return func(input);
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`);
    }
  }
}

module.exports = new Executor();