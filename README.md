# Physics Visualizer

Type a physics equation at the top; a live animation with sliders appears below.
Built for laptops and iPads first (college physics), phone version later.

## Run it
Open `index.html` through any static web server (no build step).

## Phase 1 (done)
- Layout: equation bar on top, animation ~70%, sliders on the right, collapsible graph strip
- Keyboard / math-pad toggle (math pad slides up only while typing)
- Equation matcher: recognizes library equations even when rearranged
- Snell's law + critical angle animation (refraction, total internal reflection, Fresnel reflection %, light slows in denser material)
- Unknown equations with one variable are graphed; close library matches are suggested

## Phase 2 (done)
- Thin lens ray diagram (converging and diverging), linked to the thin lens and magnification equations
- Curved mirror ray diagram (concave and convex), linked to f = R/2
- Three principal rays with moving light pulses, real vs virtual images (dashed trace-backs), focal points F, 2F, C
- Readouts: image distance, magnification, image height, real/virtual, upright/inverted, enlarged/reduced
- Graph strip: image distance vs object distance

## Phase 3 (done)
- Ideal gas (PV = nRT): particles bouncing in a piston cylinder; speed follows temperature, count follows moles, piston follows volume; pressure gauge; P–V isotherm graph
- First law (ΔU = Q − W): heat arrows in/out, work arrow on the piston, energy bars, temperature and volume change played as a process
- Specific heat (Q = mcΔT): block or beaker heated on a burner, animated thermometer, 5 materials, warning when water would boil; T vs Q graph comparing materials

## Phase 4 (done): installable + offline
- App manifest, icons, Install button (Chrome/Edge prompt; iPad shows Add to Home Screen steps)
- `npm install && npm run build` makes `dist/`: all code in one minified, name-scrambled file plus an offline cache
- Host `dist/` on any HTTPS host (Netlify, Cloudflare); after the first visit it works with no internet

## Phase 5 (done): special relativity
- Lorentz factor, time dilation, length contraction: a ship with a light clock flies past; its photon zigzags, its clock ticks slower and its length shrinks, compared with the same ship at rest; γ vs v graph
- Mass–energy (E = mc², E = γmc²): rest energy in joules, TNT and homes powered; kinetic energy bars, relativity vs Newton; KE vs v graph
- Velocity addition: light, true probe, Newton's guess and the ship race from one launch line; Newton's guess can pass light, the real answer never does
- Math pad gets a relativity row: γ ₀ ² c v u E m L t

## Next phases
- More equations, then phone layout
