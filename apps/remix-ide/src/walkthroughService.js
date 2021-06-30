const introJs = require('intro.js')

export class WalkthroughService {
  constructor (params) {
    this.params = params
  }

  start (params) {
    if (!localStorage.getItem('hadTour_initial')) {
      introJs().setOptions({
        steps: [{
          title: 'Welcome to RemixIDE',
          intro: 'Click on an icon to launch our Home tab with all neccessary links and tips.',
          element: document.querySelector('#verticalIconsHomeIcon'),
          tooltipClass: 'bg-light text-dark',
          position: 'right'
        },
        {
          element: document.querySelector('#compileIcons'),
          title: 'Solidity',
          intro: 'Select a contract and switch to solidity plugin to compile',
          tooltipClass: 'bg-light text-dark',
          position: 'right'
        },
        {
          title: 'Deploy your contract',
          element: document.querySelector('#runIcons'),
          intro: 'Here you go, almost done. Now switch to the plugin to Deploy your contract.',
          tooltipClass: 'bg-light text-dark',
          position: 'right'
        }
        ]
      }).start()
      localStorage.setItem('hadTour_initial', true)
    }
  }

  startFeatureTour () {
  }
}
