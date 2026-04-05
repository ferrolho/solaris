import * as THREE from 'three'
import * as Utils from './Utilities'
import * as ws from './Workspace'
import { createCoronaMaterial } from './SunMaterial'
import { dateToJulianDate } from './Ephemeris'
import type { BodyData } from './SIConstants'

const UP = new THREE.Vector3(0, 1, 0)

class Body {
    name: string
    pos: THREE.Vector3
    vel: THREE.Vector3
    mass: number
    radius: number
    mesh: THREE.Mesh
    atmosphere?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>
    rings?: THREE.Mesh<THREE.RingGeometry, THREE.MeshPhongMaterial>
    corona?: THREE.Mesh
    light?: THREE.PointLight
    acc: THREE.Vector3
    next_vel: THREE.Vector3
    next_pos: THREE.Vector3

    // Rotation state
    spinAxis?: THREE.Vector3
    tiltQuaternion?: THREE.Quaternion
    rotationSpeed: number = 0   // radians per sim-second
    spinAngle: number = 0       // current spin angle in radians
    tidallyLocked?: string

    constructor(data: BodyData) {
        this.name = data.name

        this.pos = new THREE.Vector3()
        this.pos.x = Utils.km_to_astronomical_units(data.ephemeris.x)
        this.pos.z = Utils.km_to_astronomical_units(data.ephemeris.y)
        this.pos.y = Utils.km_to_astronomical_units(data.ephemeris.z)

        this.vel = new THREE.Vector3()
        this.vel.x = Utils.km_to_astronomical_units(data.ephemeris.vx)
        this.vel.z = Utils.km_to_astronomical_units(data.ephemeris.vy)
        this.vel.y = Utils.km_to_astronomical_units(data.ephemeris.vz)

        this.mass = Utils.kg_to_solar_masses(data.mass)
        this.radius = Utils.km_to_astronomical_units(data.radius)

        this.acc = new THREE.Vector3(0, 0, 0)
        this.next_vel = new THREE.Vector3()
        this.next_pos = new THREE.Vector3()

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8 * 4, 6 * 4),
            new THREE.MeshPhongMaterial({ color: 'white' }))

        if (data.visuals) {
            console.log(`Adding visual fx to ${this.name}`)
            const material = this.mesh.material as THREE.MeshPhongMaterial

            if (data.visuals.tex_color) {
                material.map = ws.textureLoader.load(data.visuals.tex_color)
            }

            if (data.visuals.tex_bump) {
                material.bumpMap = ws.textureLoader.load(data.visuals.tex_bump)
                material.bumpScale = 0.006 * this.radius
            }

            if (data.visuals.tex_spec) {
                material.specularMap = ws.textureLoader.load(data.visuals.tex_spec)
            }

            if (data.visuals.tex_normal) {
                material.normalMap = ws.textureLoader.load(data.visuals.tex_normal)
            }
        }

        this.mesh.scale.multiplyScalar(this.radius)
        ws.scene.add(this.mesh)

        // Axial tilt and rotation
        if (data.rotation) {
            const axis = Utils.northPoleToWorldAxis(data.rotation.northPoleRA, data.rotation.northPoleDec)
            this.spinAxis = new THREE.Vector3(axis.x, axis.y, axis.z).normalize()
            this.tiltQuaternion = new THREE.Quaternion().setFromUnitVectors(UP, this.spinAxis)

            // radians per sim-second (period is in hours)
            this.rotationSpeed = (2 * Math.PI) / (Math.abs(data.rotation.period) * 3600)
            if (data.rotation.period < 0) this.rotationSpeed = -this.rotationSpeed

            // Compute initial spin angle for the current date/time
            const jd = dateToJulianDate(new Date())
            let pmRA: number
            if (this.name === 'Earth') {
                pmRA = Utils.computeGMST(jd)
            } else {
                pmRA = Utils.computePrimeMeridianRA(
                    data.rotation.northPoleRA, data.rotation.W0,
                    data.rotation.period, jd)
            }

            // Illumination correction for Three.js UV handedness mismatch.
            //
            // Three.js SphereGeometry wraps textures such that, viewed from the
            // north pole, longitude increases clockwise (+X → −Z). But the
            // right-hand-rule quaternion rotates counterclockwise (+X → +Z).
            // The texture-to-geometry mapping is correct (a pin at London's
            // coordinates lands on London), but the spin rotation moves the
            // illuminated face to the wrong longitude by an amount that depends
            // on the Sun's ecliptic position relative to the body's tilt axis.
            //
            // The correction 2×C₀ compensates exactly for one point light (the
            // Sun). If a second light source were added, it would need its own
            // correction — or the geometry/UV convention would need to be fixed
            // at the SphereGeometry level instead.
            const sunDir = this.pos.clone().negate().normalize()  // Sun ≈ origin
            const sunBody0 = sunDir.clone().applyQuaternion(this.tiltQuaternion.clone().invert())
            const C0 = Math.atan2(-sunBody0.z, sunBody0.x) * 180 / Math.PI

            this.spinAngle = (pmRA + 2 * C0) * Math.PI / 180

            if (data.rotation.tidallyLocked) {
                this.tidallyLocked = data.rotation.tidallyLocked.toLowerCase()
            }
        }

        if (data.atmosphere) {
            console.log(`Adding atmosphere visual fx to ${this.name}`)
            this.atmosphere = new THREE.Mesh(
                new THREE.SphereGeometry(1, 8 * 4, 6 * 4),
                new THREE.MeshPhongMaterial({ color: 'white' }))

            const tex_color = ws.textureLoader.load(data.atmosphere.tex_color)

            this.atmosphere.material.map = tex_color
            this.atmosphere.material.alphaMap = tex_color
            this.atmosphere.material.transparent = true

            this.atmosphere.scale.multiplyScalar(1.004 * this.radius)
            ws.scene.add(this.atmosphere)
        }

        if (data.rings) {
            const innerRadius = Utils.km_to_astronomical_units(data.rings.near) / this.radius
            const outerRadius = Utils.km_to_astronomical_units(data.rings.far) / this.radius
            const thetaSegments = 100
            const phiSegments = 1

            this.rings = new THREE.Mesh(
                new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments, phiSegments),
                new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, transparent: true }))

            // Ring lies in XY plane; rotate so its normal aligns with local +Y (pole)
            this.rings.rotateX(Math.PI / 2)

            const uvs: number[] = []
            for (let i = 0; i <= phiSegments; i++) {
                for (let j = 0; j <= thetaSegments; j++) {
                    uvs.push(i / phiSegments, j / thetaSegments)
                }
            }

            this.rings.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))

            const tex_color = ws.textureLoader.load(data.rings.tex_color)
            this.rings.material.map = tex_color

            // Parent rings to the mesh so they inherit tilt
            this.mesh.add(this.rings)
        }

        // Stars: single billboard renders photosphere + corona
        if (data.type == 'star') {
            this.mesh.visible = false

            this.corona = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                createCoronaMaterial())
            this.corona.scale.multiplyScalar(6.0 * this.radius)
            ws.scene.add(this.corona)

            this.light = new THREE.PointLight('white', 3, 0, 0)
            ws.scene.add(this.light)
        }

        this.updateVisual()

        // Register body
        ws.body_map[this.name.toLowerCase()] = this
    }

    computeNextState(): void {
        this.acc = new THREE.Vector3(0, 0, 0)
        this.next_vel = new THREE.Vector3().addVectors(this.vel, this.acc).multiplyScalar(ws.delta)
        this.next_pos = new THREE.Vector3().addVectors(this.pos, this.next_vel)
    }

    applyNextState(): void {
        this.vel = this.next_vel
        this.pos = this.next_pos

        this.updateVisual()
    }

    updateVisual(): void {
        this.mesh.position.copy(this.pos)

        // Rotation: tilt + spin
        if (this.spinAxis && this.tiltQuaternion) {
            if (this.tidallyLocked) {
                // Orient so one face always points toward parent body
                const parent = ws.body_map[this.tidallyLocked]
                if (parent) {
                    const toParent = new THREE.Vector3().subVectors(parent.pos, this.pos).normalize()
                    // Project toParent onto equatorial plane (perpendicular to spin axis)
                    const dot = toParent.dot(this.spinAxis)
                    const forward = new THREE.Vector3().copy(toParent)
                        .addScaledVector(this.spinAxis, -dot).normalize()
                    const right = new THREE.Vector3().crossVectors(this.spinAxis, forward)
                    // Build rotation matrix: local -Z faces parent (texture center),
                    // local +Y is spin axis
                    const m = new THREE.Matrix4().makeBasis(right, this.spinAxis, forward.negate())
                    this.mesh.quaternion.setFromRotationMatrix(m)
                }
            } else {
                this.spinAngle += this.rotationSpeed * ws.delta * ws.timeScale
                const spinQuat = new THREE.Quaternion().setFromAxisAngle(this.spinAxis, this.spinAngle)
                this.mesh.quaternion.copy(spinQuat).multiply(this.tiltQuaternion)
            }
        }

        if (this.atmosphere) {
            this.atmosphere.position.copy(this.pos)
            // Atmosphere shares the planet's tilt but drifts slightly slower
            if (this.spinAxis && this.tiltQuaternion) {
                const atmAngle = this.spinAngle * 0.95
                const spinQuat = new THREE.Quaternion().setFromAxisAngle(this.spinAxis, atmAngle)
                this.atmosphere.quaternion.copy(spinQuat).multiply(this.tiltQuaternion)
            }
        }

        if (this.corona) {
            this.corona.position.copy(this.pos)
            const coronaMat = this.corona.material as THREE.ShaderMaterial
            coronaMat.uniforms.uTime.value = performance.now() * 0.001
        }

        if (this.mesh.visible && (this.mesh.material as THREE.ShaderMaterial).isShaderMaterial) {
            const sunMat = this.mesh.material as THREE.ShaderMaterial
            sunMat.uniforms.uTime.value = performance.now() * 0.001
        }

        if (this.light)
            this.light.position.copy(this.pos)
    }

    get info(): string {
        return `Body: ${this.name}:\n` +
            `  mass: ${this.mass} M☉\n` +
            `radius: ${this.radius} au\n` +
            `  pos: ${this.pos.toArray().map(x => x.toFixed(4))} au\n` +
            `  vel: ${this.vel.toArray()}\n`
    }
}

export default Body
