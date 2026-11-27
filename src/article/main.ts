import { applyMarks } from './marks'
import { bindOpeners, installGameWindow } from './gameWindow'
import './gameWindow.css'

// The article page script: the Seen and Missed marks, and the game window.
// No game code and no 3D code is imported here, only the typed message module.
applyMarks()

const win = installGameWindow({
  onRun: () => {},
  onEnd: () => {
    applyMarks()
    const target = document.getElementById('what-really-happened')
    if (!target) return
    target.scrollIntoView({ behavior: 'auto', block: 'start' })
    window.history.replaceState(null, '', '#what-really-happened')
  },
})
bindOpeners(win.open)
