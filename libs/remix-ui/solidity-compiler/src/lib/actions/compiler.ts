import React from 'react'

export const setEditorMode = (mode: string) => {
  return {
    type: 'SET_EDITOR_MODE',
    payload: mode
  }
}

export const resetEditorMode = () => (dispatch: React.Dispatch<any>) => {
  dispatch({
    type: 'RESET_EDITOR_MODE'
  })
}

export const setCompilerMode = (mode: string, ...args) => {
  return {
    type: 'SET_COMPILER_MODE',
    payload: { mode, args }
  }
}

export const resetCompilerMode = () => (dispatch: React.Dispatch<any>) => {
  dispatch({
    type: 'RESET_COMPILER_MODE'
  })
}

export const listenToEvents = (editor, compileTabLogic) => (dispatch: React.Dispatch<any>) => {
  editor.event.register('sessionSwitched', () => {
    dispatch(setEditorMode('sessionSwitched'))
  })

  compileTabLogic.event.on('startingCompilation', () => {
    dispatch(setCompilerMode('startingCompilation'))
  })

  compileTabLogic.compiler.event.register('compilationDuration', (speed) => {
    dispatch(setCompilerMode('compilationDuration', speed))
  })

  editor.event.register('contentChanged', () => {
    dispatch(setEditorMode('contentChanged'))
  })

  compileTabLogic.compiler.event.register('loadingCompiler', () => {
    dispatch(setCompilerMode('compilationDuration'))
  })

  compileTabLogic.compiler.event.register('compilerLoaded', () => {
    dispatch(setCompilerMode('compilerLoaded'))
  })

  compileTabLogic.compiler.event.register('compilationFinished', (success, data, source) => {
    dispatch(setCompilerMode('compilationFinished', success, data, source))
  })
}
