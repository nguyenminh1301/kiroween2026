// The article page script: folds the section menu on narrow screens.
// No game code and no 3D code is imported here.

function setupMenu(): void {
  const nav = document.querySelector<HTMLElement>('.sections')
  const toggle = nav?.querySelector<HTMLButtonElement>('.menu-toggle')
  if (!nav || !toggle) return
  const set = (open: boolean) => {
    nav.classList.toggle('open', open)
    toggle.setAttribute('aria-expanded', String(open))
  }
  toggle.addEventListener('click', () => set(!nav.classList.contains('open')))
  nav.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) set(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') set(false)
  })
}

setupMenu()
