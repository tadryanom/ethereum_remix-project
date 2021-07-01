/* global */
import React from 'react' // eslint-disable-line
import ReactDOM from 'react-dom'
import { SolidityCompiler, CompileTab as CompileTabLogic } from '@remix-ui/solidity-compiler' // eslint-disable-line
import { ViewPlugin } from '@remixproject/engine-web'
import * as packageJson from '../../../../../package.json'
import { compile } from '../compiler/compiler-helpers'

const EventEmitter = require('events')
const $ = require('jquery')
const yo = require('yo-yo')
var QueryParams = require('../../lib/query-params')
const parseContracts = require('./compileTab/contractParser')
const addTooltip = require('../ui/tooltip')
const globalRegistry = require('../../global/registry')

const profile = {
  name: 'solidity',
  displayName: 'Solidity compiler',
  icon: 'assets/img/solidity.webp',
  description: 'Compile solidity contracts',
  kind: 'compiler',
  permission: true,
  location: 'sidePanel',
  documentation: 'https://remix-ide.readthedocs.io/en/latest/solidity_editor.html',
  version: packageJson.version,
  methods: ['getCompilationResult', 'compile', 'compileWithParameters', 'setCompilerConfig']

}

// EditorApi:
// - events: ['compilationFinished'],
// - methods: ['getCompilationResult']

class CompileTab extends ViewPlugin {
  constructor (editor, config, fileProvider, fileManager, contentImport) {
    super(profile)
    this.events = new EventEmitter()
    this._view = {
      el: null,
      warnCompilationSlow: null,
      errorContainer: null,
      contractEl: null
    }
    this.contentImport = contentImport
    this.queryParams = new QueryParams()
    this.fileProvider = fileProvider
    // dependencies
    this.editor = editor
    this.config = config
    // this.renderer = new Renderer(this)
    this.fileManager = fileManager
    this.contractsDetails = {}
    this.data = {
      eventHandlers: {},
      loading: false
    }
    this.compileTabLogic = new CompileTabLogic(
      this.queryParams,
      this.fileManager,
      this.editor,
      this.config,
      this.fileProvider,
      this.contentImport
    )
    this.compiler = this.compileTabLogic.compiler
    this.compileTabLogic.init()
    this.contractMap = {}

    this.el = document.createElement('div')
    this.el.setAttribute('id', 'compileTabView')
  }

  resetResults () {
    this.currentFile = ''
    this.contractsDetails = {}
    this.emit('statusChanged', { key: 'none' })
    this.renderComponent()
  }

  /************
   * EVENTS
   */

  listenToEvents () {
    this.on('filePanel', 'setWorkspace', (workspace) => {
      this.compileTabLogic.isHardhatProject().then((result) => {
        if (result && workspace.isLocalhost) this.compilerContainer.hardhatCompilation.style.display = 'flex'
        else this.compilerContainer.hardhatCompilation.style.display = 'none'
      })
    })

    this.data.eventHandlers.onContentChanged = () => {
      this.emit('statusChanged', { key: 'edited', title: 'the content has changed, needs recompilation', type: 'info' })
    }
    this.editor.event.register('contentChanged', this.data.eventHandlers.onContentChanged)

    this.data.eventHandlers.onLoadingCompiler = () => {
      this.data.loading = true
      this.emit('statusChanged', { key: 'loading', title: 'loading compiler...', type: 'info' })
    }
    this.compiler.event.register('loadingCompiler', this.data.eventHandlers.onLoadingCompiler)

    this.data.eventHandlers.onCompilerLoaded = () => {
      this.data.loading = false
      this.emit('statusChanged', { key: 'none' })
    }
    this.compiler.event.register('compilerLoaded', this.data.eventHandlers.onCompilerLoaded)

    this.data.eventHandlers.onStartingCompilation = () => {
      this.emit('statusChanged', { key: 'loading', title: 'compiling...', type: 'info' })
    }

    this.data.eventHandlers.onRemoveAnnotations = () => {
      this.call('editor', 'clearAnnotations')
    }

    this.on('filePanel', 'setWorkspace', () => this.resetResults())

    this.compileTabLogic.event.on('startingCompilation', this.data.eventHandlers.onStartingCompilation)
    this.compileTabLogic.event.on('removeAnnotations', this.data.eventHandlers.onRemoveAnnotations)

    this.data.eventHandlers.onCurrentFileChanged = (name) => {
      this.currentFile = name
      this.renderComponent()
    }
    this.fileManager.events.on('currentFileChanged', this.data.eventHandlers.onCurrentFileChanged)

    this.data.eventHandlers.onNoFileSelected = () => {
      this.currentFile = ''
      this.renderComponent()
    }
    this.fileManager.events.on('noFileSelected', this.data.eventHandlers.onNoFileSelected)

    this.data.eventHandlers.onCompilationFinished = (success, data, source) => {
      this.compileErrors = data
      if (success) {
        // forwarding the event to the appManager infra
        this.emit('compilationFinished', source.target, source, 'soljson', data)
        if (data.errors && data.errors.length > 0) {
          this.emit('statusChanged', {
            key: data.errors.length,
            title: `compilation finished successful with warning${data.errors.length > 1 ? 's' : ''}`,
            type: 'warning'
          })
        } else this.emit('statusChanged', { key: 'succeed', title: 'compilation successful', type: 'success' })
        // Store the contracts
        this.contractsDetails = {}
        this.compiler.visitContracts((contract) => {
          this.contractsDetails[contract.name] = parseContracts(
            contract.name,
            contract.object,
            this.compiler.getSource(contract.file)
          )
        })
      } else {
        const count = (data.errors ? data.errors.filter(error => error.severity === 'error').length : 0 + data.error ? 1 : 0)
        this.emit('statusChanged', { key: count, title: `compilation failed with ${count} error${count.length > 1 ? 's' : ''}`, type: 'error' })
      }
      // Update contract Selection
      this.contractMap = {}
      if (success) this.compiler.visitContracts((contract) => { this.contractMap[contract.name] = contract })
      this.renderComponent()
    }
    this.compiler.event.register('compilationFinished', this.data.eventHandlers.onCompilationFinished)

    this.data.eventHandlers.onThemeChanged = (theme) => {
      const invert = theme.quality === 'dark' ? 1 : 0
      const img = document.getElementById('swarmLogo')
      if (img) {
        img.style.filter = `invert(${invert})`
      }
    }
    globalRegistry.get('themeModule').api.events.on('themeChanged', this.data.eventHandlers.onThemeChanged)

    // Run the compiler instead of trying to save the website
    $(window).keydown((e) => {
      // ctrl+s or command+s
      if ((e.metaKey || e.ctrlKey) && e.keyCode === 83) {
        e.preventDefault()
        this.compileTabLogic.runCompiler(this.hhCompilation)
      }
    })
  }

  setHardHatCompilation (value) {
    this.hhCompilation = value
  }

  getCompilationResult () {
    return this.compileTabLogic.compiler.state.lastCompilationResult
  }

  /**
   * compile using @arg fileName.
   * The module UI will be updated accordingly to the new compilation result.
   * This function is used by remix-plugin compiler API.
   * @param {string} fileName to compile
   */
  compile (fileName) {
    addTooltip(yo`<div><b>${this.currentRequest.from}</b> is requiring to compile <b>${fileName}</b></div>`)
    return this.compileTabLogic.compileFile(fileName)
  }

  /**
   * compile using @arg compilationTargets and @arg settings
   * The module UI will *not* be updated, the compilation result is returned
   * This function is used by remix-plugin compiler API.
   * @param {object} map of source files.
   * @param {object} settings {evmVersion, optimize, runs, version, language}
   */
  async compileWithParameters (compilationTargets, settings) {
    settings.version = settings.version || this.compilerContainer.data.selectedVersion
    const res = await compile(compilationTargets, settings)
    return res
  }

  // This function is used for passing the compiler configuration to 'remix-tests'
  getCurrentCompilerConfig () {
    return {
      currentVersion: this.compilerContainer.data.selectedVersion,
      evmVersion: this.compileTabLogic.evmVersion,
      optimize: this.compileTabLogic.optimize,
      runs: this.compileTabLogic.runs
    }
  }

  /**
   * set the compiler configuration
   * This function is used by remix-plugin compiler API.
   * @param {object} settings {evmVersion, optimize, runs, version, language}
   */
  setCompilerConfig (settings) {
    return new Promise((resolve, reject) => {
      addTooltip(yo`<div><b>${this.currentRequest.from}</b> is updating the <b>Solidity compiler configuration</b>.<pre class="text-left">${JSON.stringify(settings, null, '\t')}</pre></div>`)
      this.compilerContainer.setConfiguration(settings)
      // @todo(#2875) should use loading compiler return value to check whether the compiler is loaded instead of "setInterval"
      let timeout = 0
      const id = setInterval(() => {
        timeout++
        console.log(this.data.loading)
        if (!this.data.loading || timeout > 10) {
          resolve()
          clearInterval(id)
        }
      }, 200)
    })
  }

  // TODO : Add success alert when compilation succeed
  contractCompiledSuccess () {
    return yo`<div></div>`
  }

  // TODO : Add error alert when compilation failed
  contractCompiledError () {
    return yo`<div></div>`
  }

  /************
   * METHODS
   */

  selectContract (contractName) {
    this.selectedContract = contractName
  }

  render () {
    this.renderComponent()
    return this.el
  }

  renderComponent () {
    ReactDOM.render(
      <SolidityCompiler
        editor={this.editor}
        config={this.config}
        fileProvider={this.fileProvider}
        fileManager={this.fileManager}
        contentImport={this.contentImport}
        queryParams={this.queryParams}
        plugin={this}
        compileTabLogic={this.compileTabLogic}
        compiledFileName={this.currentFile}
        contractsDetails={this.contractsDetails}
        setHardHatCompilation={this.setHardHatCompilation}
        contractMap={this.contractMap}
        compileErrors={this.compileErrors || {}}
      />
      , this.el)
  }

  onActivation () {
    this.call('manager', 'activatePlugin', 'solidity-logic')
    this.listenToEvents()
  }

  onDeactivation () {
    this.editor.event.unregister('contentChanged')
    this.editor.event.unregister('sessionSwitched')
    this.editor.event.unregister('contentChanged', this.data.eventHandlers.onContentChanged)
    this.compiler.event.unregister('loadingCompiler', this.data.eventHandlers.onLoadingCompiler)
    this.compiler.event.unregister('compilerLoaded', this.data.eventHandlers.onCompilerLoaded)
    this.compileTabLogic.event.removeListener('startingCompilation', this.data.eventHandlers.onStartingCompilation)
    this.fileManager.events.removeListener('currentFileChanged', this.data.eventHandlers.onCurrentFileChanged)
    this.fileManager.events.removeListener('noFileSelected', this.data.eventHandlers.onNoFileSelected)
    this.compiler.event.unregister('compilationFinished', this.data.eventHandlers.onCompilationFinished)
    globalRegistry.get('themeModule').api.events.removeListener('themeChanged', this.data.eventHandlers.onThemeChanged)
    this.call('manager', 'deactivatePlugin', 'solidity-logic')
  }
}

module.exports = CompileTab
