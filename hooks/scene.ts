// The backdrop: a retro sunset over a neon grid, drawn as one animated SVG.
//
// A night sky with twinkling stars and the odd shooting star, a striped sun sinking
// behind wireframe mountains, a glowing horizon, and a grid floor rolling toward you.
// SynthWave '84 is a dark theme, so the scene has one mode.
// No script, nothing loaded: CSS animations only, stopped under reduced motion.

const W = 1600
const H = 1000
const HORIZON = 640
const VX = 800

// A small deterministic random, so the scene is the same on every load.
function random(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const f = (n: number): string => Math.round(n).toString()

/** Stars in the upper sky, some twinkling. */
function stars(seed: number): string {
  const rnd = random(seed)
  let still = ''
  let twinkle = ''
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W
    const y = rnd() * rnd() * (HORIZON - 120)
    const r = (0.6 + rnd() * 1.4).toFixed(1)
    if (rnd() > 0.7) twinkle += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" style="animation-delay:${(-rnd() * 5).toFixed(1)}s"/>`
    else still += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}"/>`
  }
  return `<g class="stars">${still}</g><g class="stars twinkle">${twinkle}</g>`
}

/** Two shooting stars, each crossing the sky once in a long while. */
function shooting(): string {
  return (
    `<g class="shoot" style="animation-delay:-3s"><line x1="300" y1="90" x2="390" y2="130"/></g>` +
    `<g class="shoot" style="animation-delay:-13s;animation-duration:23s"><line x1="1180" y1="60" x2="1270" y2="100"/></g>`
  )
}

/** The sun: a warm gradient disc, cut by stripes that widen toward the horizon. */
function sun(): string {
  // In the right margin, where the conversation leaves the scene in view.
  const x = 1400
  const y = 500
  const r = 185
  let bars = ''
  let gy = y - r * 0.15
  let gap = 3
  while (gy < y + r) {
    bars += `<rect x="${x - r}" y="${f(gy)}" width="${r * 2}" height="${gap.toFixed(1)}"/>`
    gy += gap + 12
    gap += 2.4
  }
  return (
    `<mask id="stripes" maskUnits="userSpaceOnUse" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}">` +
    `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" fill="#fff"/><g fill="#000">${bars}</g></mask>` +
    `<ellipse class="halo" cx="${x}" cy="${y + 40}" rx="${r * 3}" ry="${r * 1.9}" fill="url(#halo)"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#sun)" mask="url(#stripes)"/>`
  )
}

/**
 * A wireframe mountain range: a jagged ridge from `from` to `to`, filled dark, with a neon
 * edge and faint ridge lines running down from each peak.
 */
function mountains(from: number, to: number, peak: number, seed: number, cls: string): string {
  const rnd = random(seed)
  const points: [number, number][] = [[from, HORIZON]]
  const steps = 11
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const x = from + (to - from) * t
    // Higher toward the outer edge of the range, low toward the middle of the screen.
    const outer = from < VX ? 1 - t : t
    const h = peak * (0.25 + 0.75 * outer) * (0.55 + rnd() * 0.45) * (i % 2 === 0 ? 0.62 : 1)
    points.push([x + (rnd() - 0.5) * 30, HORIZON - h])
  }
  points.push([to, HORIZON])
  const ridge = points.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')
  let wires = ''
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]!
    if (HORIZON - y < 40) continue
    wires += `M${f(x)},${f(y)} L${f(x + (rnd() - 0.5) * 90)},${HORIZON}`
    wires += `M${f(x)},${f(y)} L${f(x - 60 - rnd() * 60)},${f(y + (HORIZON - y) * 0.6)}`
  }
  return (
    `<g class="range ${cls}">` +
    `<polygon class="rock" points="${ridge}"/>` +
    `<path class="wire" d="${wires}"/>` +
    `<polyline class="edge halo" points="${ridge}"/><polyline class="edge" points="${ridge}"/>` +
    `</g>`
  )
}

// The floor in perspective. A point of the floor at depth z (in tiles, the camera one tile
// high) and across offset X lies at y = HORIZON + FOCAL / z and x = VX + FOCAL * X / z. Rays
// are lines of constant X, rows lines of constant z, both one tile apart, so every cell is
// a square seen from the camera. Rows roll from Z_FAR to Z_NEAR, one tile per ROLL / ROWS.
const FOCAL = 400
const TILE = 0.5
const Z_NEAR = 1
const ROWS = 60
const Z_FAR = Z_NEAR + ROWS * TILE
const ROLL = 30

const rowOffset = (z: number): number => FOCAL / z

/**
 * Keyframes that bring a row from Z_FAR to Z_NEAR at a steady speed. The screen position
 * follows 1/z, so many stops keep the piecewise motion on the curve near the viewer.
 */
function rollKeyframes(): string {
  const stops = 100
  let frames = ''
  for (let i = 0; i <= stops; i++) {
    const z = Z_FAR - (Z_FAR - Z_NEAR) * (i / stops)
    const y = rowOffset(z) - rowOffset(Z_FAR)
    frames += `${i}%{transform:translateY(${y.toFixed(2)}px)}`
  }
  return `@keyframes roll{${frames}}`
}

/** The floor: rays to the vanishing point and rows rolling toward you, fading at the horizon. */
function grid(): string {
  let rays = ''
  const bottom = HORIZON + rowOffset(Z_NEAR)
  for (let i = -16; i <= 16; i++) {
    rays += `M${VX},${HORIZON} L${f(VX + (FOCAL * i * TILE) / Z_NEAR)},${f(bottom)}`
  }
  let rows = ''
  const top = HORIZON + rowOffset(Z_FAR)
  for (let i = 0; i < ROWS; i++) {
    const delay = (-(i * ROLL) / ROWS).toFixed(3)
    rows += `<rect class="row" x="-600" y="${(top - 1.1).toFixed(1)}" width="${W + 1200}" height="2.2" style="animation-delay:${delay}s"/>`
  }
  return (
    `<rect x="-600" y="${HORIZON}" width="${W + 1200}" height="${H - HORIZON + 200}" fill="url(#floor)"/>` +
    `<g mask="url(#fade)"><path class="rays halo" d="${rays}"/><path class="rays" d="${rays}"/>` +
    `<g class="rows">${rows}</g></g>` +
    `<rect x="-600" y="${HORIZON}" width="${W + 1200}" height="140" fill="url(#mist)"/>`
  )
}

const STYLE =
  `.stars circle{fill:#fff6ff;opacity:.75}.twinkle circle{animation:twinkle 5s ease-in-out infinite}` +
  `.shoot{opacity:0;animation:shoot 17s linear infinite}.shoot line{stroke:#fff;stroke-width:2;stroke-linecap:round}` +
  `.halo{animation:pulse 6s ease-in-out infinite alternate}` +
  `.rock{fill:#120c1f}.wire{fill:none;stroke-width:1.2;stroke-opacity:.5}` +
  `.edge{fill:none;stroke-width:2.2;stroke-linejoin:round}.edge.halo{stroke-width:10;stroke-opacity:.22}` +
  `.left .edge,.left .wire{stroke:#36f9f6}.right .edge,.right .wire{stroke:#ff7edb}` +
  `.far .rock{fill:#1d1233}.far .edge{stroke:#b893ce;stroke-opacity:.6}.far .wire{stroke:#b893ce;stroke-opacity:.2}` +
  `.horizon{fill:#ff7edb}.horizon.halo{opacity:.5}` +
  `.rays{fill:none;stroke:#ff7edb;stroke-width:1.6;stroke-opacity:.55}.rays.halo{stroke-width:7;stroke-opacity:.12}` +
  `.row{fill:#ff7edb;animation:roll ${ROLL}s linear infinite}` +
  `@keyframes twinkle{0%,100%{opacity:.85}50%{opacity:.15}}` +
  `@keyframes shoot{0%{opacity:0;transform:translate(0,0)}2%{opacity:1}6%{opacity:0;transform:translate(260px,115px)}100%{opacity:0;transform:translate(260px,115px)}}` +
  `@keyframes pulse{from{opacity:.75}to{opacity:1}}` +
  rollKeyframes() +
  // A narrower box: bring the sun in from the right edge.
  `@media (max-aspect-ratio:3/2){.sunpos{transform:translateX(-160px)}}` +
  `@media (max-aspect-ratio:1/1){.sunpos{transform:translateX(-500px)}}` +
  `@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}`

const DEFS =
  `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#0c0717"/><stop offset=".45" stop-color="#241b2f"/><stop offset=".78" stop-color="#4b2368"/><stop offset="1" stop-color="#a8327c"/></linearGradient>` +
  `<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#fede5d"/><stop offset=".45" stop-color="#ff8b39"/><stop offset="1" stop-color="#ff2e97"/></linearGradient>` +
  `<radialGradient id="halo"><stop offset="0" stop-color="#ff7edb" stop-opacity=".55"/><stop offset="1" stop-color="#ff7edb" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1340"/><stop offset="1" stop-color="#0c0717"/></linearGradient>` +
  `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7edb" stop-opacity=".35"/><stop offset="1" stop-color="#ff7edb" stop-opacity="0"/></linearGradient>` +
  // The grid fades into the haze toward the horizon, where its lines would crowd together.
  `<linearGradient id="fadeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".22" stop-color="#fff"/></linearGradient>` +
  `<mask id="fade" maskUnits="userSpaceOnUse" x="-600" y="${HORIZON}" width="${W + 1200}" height="${H - HORIZON + 200}">` +
  `<rect x="-600" y="${HORIZON}" width="${W + 1200}" height="${H - HORIZON + 200}" fill="url(#fadeg)"/></mask>` +
  `<clipPath id="ground"><rect x="-600" y="${HORIZON}" width="${W + 1200}" height="${H - HORIZON + 200}"/></clipPath>`

/**
 * The whole scene as one SVG document. `still` freezes it where it stands: each grid line
 * keeps its own distance, as under reduced motion.
 */
export function sceneSvg(still = false): string {
  const body =
    `<rect x="-600" y="-200" width="${W + 1200}" height="${HORIZON + 200}" fill="url(#sky)"/>` +
    stars(7) +
    shooting() +
    `<g class="sunpos">${sun()}</g>` +
    mountains(-500, 600, 300, 19, 'far left') +
    mountains(1060, 2100, 190, 31, 'far right') +
    mountains(-600, 500, 460, 3, 'left') +
    mountains(1180, 2200, 230, 11, 'right') +
    `<g clip-path="url(#ground)">${grid()}</g>` +
    `<rect class="horizon halo" x="-600" y="${HORIZON - 4}" width="${W + 1200}" height="8"/>` +
    `<rect class="horizon" x="-600" y="${HORIZON - 1}" width="${W + 1200}" height="2"/>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<style>${STYLE}${still ? '*{animation-play-state:paused!important}' : ''}</style><defs>${DEFS}</defs>${body}</svg>`
  )
}
