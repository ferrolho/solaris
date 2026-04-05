# Solaris

Interactive 3D solar system visualisation built with Three.js, TypeScript, and Vite.

## Quick Reference

- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm test` — run accuracy tests for ephemeris computation

## Architecture

- `src/index.ts` — entry point: renderer, camera, controls, scene setup, input handling
- `src/Body.ts` — planet/star class: mesh, textures, atmosphere, rings, physics state
- `src/Ephemeris.ts` — real-time planet position computation from Keplerian orbital elements
- `src/SIConstants.ts` — solar system database (masses, radii, texture paths, interfaces)
- `src/SunMaterial.ts` — custom shader material for the Sun (turbulence, limb darkening, corona)
- `src/Workspace.ts` — shared state (scene, texture loader, body registry, timer)
- `src/Utilities.ts` — unit conversion helpers (km/AU, kg/solar masses)
- `src/shaders/` — GLSL shader files for the Sun and corona

## Ephemeris Computation

Planet positions are computed client-side for the current date using Keplerian orbital elements from [NASA/JPL approximate positions tables](https://ssd.jpl.nasa.gov/planets/approx_pos.html). The Moon uses a simplified Meeus algorithm (~20 periodic terms).

**Approach chosen:** Keplerian elements with secular rates (valid 3000 BC – 3000 AD). Pure trig + Kepler's equation, <1ms computation, no API calls, fully offline.

**Alternatives considered and rejected:**
- VSOP87 (sub-arcsecond accuracy, but ~80KB coefficient tables — overkill for visual purposes)
- JPL Horizons API (perfect accuracy, but requires network — breaks offline requirement)
- Pre-computed lookup tables (fast, but data expires and bloats the bundle)
- N-body forward simulation (accumulates errors, computationally expensive)

**Accuracy:** ~arcminute for inner planets, sufficient for a visualisation where planets are rendered as spheres tens of pixels wide. Cross-validated against JPL Horizons reference data in `src/Ephemeris.test.ts`.

## Roadmap

- [x] Sun shader — unified billboard rendering photosphere (turbulence, sunspots, limb darkening) and corona glow in a single shader with seamless transition
- [ ] Time controls — simulation clock with adjustable time scale (e.g. 1M× to see orbits), recomputing positions via `computeEphemerisForDate()` each frame (<1ms, fits easily in the 16ms frame budget at 60 FPS). Date picker UI to jump to any date. This replaces the broken N-body physics loop — analytical Keplerian positions are more accurate and cheaper than forward simulation.
- [ ] Minimap — schematic top-down orthographic view in a corner, with exaggerated planet sizes, orbital rings, and a camera position indicator ("you are here"). Rendered via a second viewport/camera pass.
- [ ] Orbital trails — draw each planet's orbital path as a faint ellipse
- [ ] Planet labels / HUD — show planet names, distances, and current date on screen
- [x] Axial tilt and rotation — planets spin on correct axes with IAU rotation data, GMST-based Earth orientation, and UV handedness correction for accurate illumination
- [x] Earth night lights — city lights texture blended onto the dark side via shader injection, with smooth terminator transition
- [ ] More moons — add major moons of Jupiter, Saturn, etc.
- [ ] Proper sRGB colour management — migrate textures to work correctly with modern Three.js colour pipeline

## UI Design Language

All HUD and overlay elements must follow this consistent style:

- **Background:** `rgba(0, 0, 0, 0.55)` with `backdrop-filter: blur(8px)`
- **Border:** `1px solid rgba(255, 255, 255, 0.1)`, `border-radius: 6px`
- **Font:** monospace stack — `'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace`
- **Text color:** primary `rgba(255, 255, 255, 0.95)`, secondary `rgba(255, 255, 255, 0.55)`
- **Accent color:** blue tint `rgba(120, 180, 255, ...)` — used for labels and subtle glow lines
- **Labels:** 9px uppercase, 2px letter-spacing, accent color at 0.5 opacity
- **Accent line:** 1px gradient along top edge (`transparent → rgba(120, 180, 255, 0.4) → transparent`)
- **Layout:** `pointer-events: none`, `z-index: 100`, `position: fixed`

Reference implementations: `src/Hud.ts`, `src/Minimap.ts`.

## Known Limitations

- **Planets do not orbit in real-time.** Positions are computed once at page load for the current date. The planned approach is to recompute Keplerian positions each frame with an accelerated simulation clock (see Roadmap), not N-body simulation.
- Legacy colour management is disabled (`THREE.ColorManagement.enabled = false`) to preserve the original visual appearance with the current textures.
