# Solaris

Interactive 3D solar system visualisation built with Three.js and Vite.

## Quick Reference

- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — production build to `dist/`

## Architecture

- `src/index.js` — entry point: renderer, camera, controls, scene setup, input handling
- `src/Body.js` — planet/star class: mesh, textures, atmosphere, rings, physics state
- `src/SIConstants.js` — solar system database (masses, radii, ephemeris, texture paths)
- `src/Workspace.js` — shared state (scene, texture loader, body registry, timer)
- `src/Utilities.js` — unit conversion helpers (km/AU, kg/solar masses)

## Known Limitations

- **Planets do not orbit.** The gravitational force computation is disabled (`computeGravitationalForces()` is commented out in `updateWorld`), and the Euler integration in `Body.computeNextState` has a bug: it multiplies velocity by delta instead of adding acceleration*delta to velocity. Fixing orbital motion requires both enabling gravity and correcting the integration.
- Legacy colour management is disabled (`THREE.ColorManagement.enabled = false`) to preserve the original visual appearance with the current textures.
