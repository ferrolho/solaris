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

- Time controls — simulation clock with adjustable time scale (e.g. 1M× to see orbits), recomputing positions via `computeEphemerisForDate()` each frame (<1ms, fits easily in the 16ms frame budget at 60 FPS). Date picker UI to jump to any date. This replaces the broken N-body physics loop — analytical Keplerian positions are more accurate and cheaper than forward simulation.
- Minimap — schematic top-down orthographic view in a corner, with exaggerated planet sizes, orbital rings, and a camera position indicator ("you are here"). Rendered via a second viewport/camera pass.
- Orbital trails — draw each planet's orbital path as a faint ellipse
- Planet labels / HUD — show planet names, distances, and current date on screen
- Axial tilt and rotation — spin planets on their correct axes
- More moons — add major moons of Jupiter, Saturn, etc.
- Proper sRGB colour management — migrate textures to work correctly with modern Three.js colour pipeline

## Known Limitations

- **Planets do not orbit in real-time.** Positions are computed once at page load for the current date. The planned approach is to recompute Keplerian positions each frame with an accelerated simulation clock (see Roadmap), not N-body simulation.
- Legacy colour management is disabled (`THREE.ColorManagement.enabled = false`) to preserve the original visual appearance with the current textures.
