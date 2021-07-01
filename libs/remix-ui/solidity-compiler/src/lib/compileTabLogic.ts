var Compiler = require('@remix-project/remix-solidity').Compiler

export default class CompileTab {
  public compiler
  public optimize
  public runs: number
  public evmVersion: string
  public compilerImport

  constructor (public queryParams, public fileManager, public editor, public config, public fileProvider, public contentImport, public miscApi) {
    // this.event = new EventEmitter()
    this.compiler = new Compiler((url, cb) => this.compilerImport.resolveAndSave(url).then((result) => cb(null, result)).catch((error) => cb(error.message)))
  }

  init () {
    this.optimize = this.queryParams.get().optimize
    this.optimize = this.optimize === 'true'
    this.queryParams.update({ optimize: this.optimize })
    this.compiler.set('optimize', this.optimize)

    this.runs = this.queryParams.get().runs
    this.runs = this.runs || 200
    this.queryParams.update({ runs: this.runs })
    this.compiler.set('runs', this.runs)

    this.evmVersion = this.queryParams.get().evmVersion
    if (this.evmVersion === 'undefined' || this.evmVersion === 'null' || !this.evmVersion) {
      this.evmVersion = null
    }
    this.queryParams.update({ evmVersion: this.evmVersion })
    this.compiler.set('evmVersion', this.evmVersion)
  }

  setOptimize (newOptimizeValue) {
    this.optimize = newOptimizeValue
    this.queryParams.update({ optimize: this.optimize })
    this.compiler.set('optimize', this.optimize)
  }

  setRuns (runs) {
    this.runs = runs
    this.queryParams.update({ runs: this.runs })
    this.compiler.set('runs', this.runs)
  }

  setEvmVersion (newEvmVersion) {
    this.evmVersion = newEvmVersion
    this.queryParams.update({ evmVersion: this.evmVersion })
    this.compiler.set('evmVersion', this.evmVersion)
  }

  /**
   * Set the compiler to using Solidity or Yul (default to Solidity)
   * @params lang {'Solidity' | 'Yul'} ...
   */
  setLanguage (lang) {
    this.compiler.set('language', lang)
  }

  /**
   * Compile a specific file of the file manager
   * @param {string} target the path to the file to compile
   */
  compileFile (target) {
    if (!target) throw new Error('No target provided for compiliation')
    const provider = this.fileManager.fileProviderOf(target)

    if (!provider) throw new Error(`cannot compile ${target}. Does not belong to any explorer`)
    return new Promise((resolve, reject) => {
      provider.get(target, (error, content) => {
        if (error) return reject(error)
        const sources = { [target]: { content } }
        // this.event.emit('startingCompilation')
        // setTimeout fix the animation on chrome... (animation triggered by 'staringCompilation')
        setTimeout(() => { this.compiler.compile(sources, target); resolve(true) }, 100)
      })
    })
  }

  runCompiler () {
    try {
      this.fileManager.saveCurrentFile()
      this.miscApi.clearAnnotations()
      var currentFile = this.config.get('currentFile')
      return this.compileFile(currentFile)
    } catch (err) {
      console.error(err)
    }
  }
}
