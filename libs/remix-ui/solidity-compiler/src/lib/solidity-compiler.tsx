import React, { useState, useEffect } from 'react' // eslint-disable-line
import { SolidityCompilerProps } from './types'
import { CompilerContainer } from './compiler-container' // eslint-disable-line
import CompileTabLogic from './compileTabLogic'
import { Toaster } from '@remix-ui/toaster' // eslint-disable-line
import { ModalDialog } from '@remix-ui/modal-dialog' // eslint-disable-line

import './css/style.css'

export const SolidityCompiler = (props: SolidityCompilerProps) => {
  const { editor, config, fileProvider, fileManager, contentImport, queryParams, plugin } = props
  const [state, setState] = useState({
    contractsDetails: {},
    eventHandlers: {},
    loading: false,
    compileTabLogic: null,
    compiler: null,
    toasterMsg: '',
    modal: {
      hide: true,
      title: '',
      message: null,
      ok: {
        label: '',
        fn: () => {}
      },
      cancel: {
        label: '',
        fn: () => {}
      },
      handleHide: null
    }
  })

  useEffect(() => {
    const miscApi = { clearAnnotations }
    const compileTabLogic = new CompileTabLogic(queryParams, fileManager, editor, config, fileProvider, contentImport, miscApi)
    const compiler = compileTabLogic.compiler

    compileTabLogic.init()
    setState(prevState => {
      return { ...prevState, compileTabLogic, compiler }
    })
  }, [])

  const toast = (message: string) => {
    setState(prevState => {
      return { ...prevState, toasterMsg: message }
    })
  }

  const clearAnnotations = () => {
    plugin.call('editor', 'clearAnnotations')
  }

  const modal = async (title: string, message: string | JSX.Element, ok: { label: string, fn: () => void }, cancel: { label: string, fn: () => void }) => {
    await setState(prevState => {
      return {
        ...prevState,
        modal: {
          ...prevState.modal,
          hide: false,
          message,
          title,
          ok,
          cancel,
          handleHide: handleHideModal
        }
      }
    })
  }

  const handleHideModal = () => {
    setState(prevState => {
      return { ...prevState, modal: { ...state.modal, hide: true, message: null } }
    })
  }
  // this.onActivationInternal()
  return (
    <>
      <div id="compileTabView">
        <CompilerContainer editor={editor} config={config} queryParams={queryParams} compileTabLogic={state.compileTabLogic} tooltip={toast} modal={modal} />
        {/* ${this._view.contractSelection} */}
        <div className="remixui_errorBlobs p-4" data-id="compiledErrors"></div>
      </div>
      <Toaster message={state.toasterMsg} />
      <ModalDialog
        id='workspacesModalDialog'
        title={ state.modal.title }
        message={ state.modal.message }
        hide={ state.modal.hide }
        ok={ state.modal.ok }
        cancel={ state.modal.cancel }
        handleHide={ handleHideModal }>
        { (typeof state.modal.message !== 'string') && state.modal.message }
      </ModalDialog>
    </>
  )
}

export default SolidityCompiler
