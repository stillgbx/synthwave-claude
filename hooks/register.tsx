import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { sceneSvg } from './scene'

// SynthWave '84 for Claude Desktop: the colors of the VS Code theme by Robb Owen
// (github.com/robb0wen/synthwave-vscode), over a retro sunset and a rolling neon grid.
//
//   /synthwave84 scene | still    the grid rolling toward you, or the same view standing still
//   /synthwave84 off              back to the app's own look (for this session)

type Backdrop = 'scene' | 'still'

const SCENES: Record<Backdrop, string> = { scene: 'synthwave84-grid', still: 'synthwave84-still' }

// SynthWave '84 is dark only. Code takes its colors from the roles: keywords pink,
// strings green, literals cyan, names red, variables yellow.
const { theme, problems } = makeColors({
  id: 'synthwave84',
  label: "SynthWave '84",
  only: 'dark',
  dark: {
    gray: {
      anchors: {
        'surface-0': '#171520',
        'surface-1': '#1f1a2b',
        'surface-2': '#241b2f',
        'surface-3': '#2a2139',
        'text-primary': '#fbf6ff',
        'text-secondary': '#d8d0ee',
        'text-muted': '#9aa0d0',
      },
    },
    roles: { accent: '#ff7edb', danger: '#fe4450', success: '#72f1b8', warning: '#fede5d', pro: '#36f9f6' },
    git: { added: '#72f1b8', removed: '#fe4450', modified: '#b893ce', merged: '#ff7edb' },
  },
})

const UNPAINTED = problems.find(line => line.startsWith("Desktop won't paint"))
const SVGS: Record<string, string> = { [SCENES.scene]: sceneSvg(), [SCENES.still]: sceneSvg(true) }

const isBackdrop = (value: unknown): value is Backdrop => value === 'scene' || value === 'still'

async function apply($: EngineInterface): Promise<string> {
  if (UNPAINTED !== undefined) $.ui.toast(UNPAINTED)
  const stored = await $.store.get('backdrop')
  const backdrop: Backdrop = isBackdrop(stored) ? stored : 'scene'
  const set = await $.theme.set({
    colors: theme,
    backdrop: { scene: SCENES[backdrop], glass: { blur: 18, opacity: 0.62 } },
  } satisfies ThemeSetArgs)
  if (!set.isDrawn) return `SynthWave '84 is set, but nothing draws it here: ${set.reason}`
  return `SynthWave '84, ${backdrop === 'scene' ? 'over the rolling grid' : 'over the grid, standing still'}.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'synthwave84',
      description: "SynthWave '84 look: /synthwave84 scene | still | off",
    })
    await apply($)
    return next(e)
  })

  on('command.run', { command: 'synthwave84' }, async ($, e) => {
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.includes('off')) {
      await $.theme.clear()
      return { text: "SynthWave '84 is off for this session. /synthwave84 brings it back." }
    }
    const unknown = words.filter(word => !isBackdrop(word))
    if (unknown.length > 0) {
      return { text: `Unknown: ${unknown.join(' ')}. Use /synthwave84 scene | still | off` }
    }
    for (const word of words) await $.store.set('backdrop', word)
    return { text: await apply($) }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const source = SVGS[e.props.scene]
    if (source === undefined) return next(e)

    const { Svg } = $.ui.resolve(e)
    return <Svg source={source} alt="A striped sun setting behind neon mountains over a rolling grid" isInteractive />
  })
}
