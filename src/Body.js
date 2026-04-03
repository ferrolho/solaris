import * as THREE from 'three'
import * as Utils from './Utilities.js'
import * as ws from './Workspace.js'

class Body {

    constructor(data) {
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

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8 * 4, 6 * 4),
            new THREE.MeshPhongMaterial({ color: 'white' }))

        if (data.visuals) {
            console.log(`Adding visual fx to ${this.name}`)

            if (data.visuals.tex_color) {
                const tex_color = ws.textureLoader.load(data.visuals.tex_color)
                this.mesh.material.map = tex_color
            }

            if (data.visuals.tex_bump) {
                const tex_bump = ws.textureLoader.load(data.visuals.tex_bump)
                this.mesh.material.bumpMap = tex_bump
                this.mesh.material.bumpScale = 0.006 * this.radius
            }

            if (data.visuals.tex_spec) {
                const tex_spec = ws.textureLoader.load(data.visuals.tex_spec)
                this.mesh.material.specularMap = tex_spec
            }

            if (data.visuals.tex_normal) {
                const tex_normal = ws.textureLoader.load(data.visuals.tex_normal)
                this.mesh.material.normalMap = tex_normal
            }
        }

        this.mesh.scale.multiplyScalar(this.radius)
        ws.scene.add(this.mesh)

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
            const innerRadius = Utils.km_to_astronomical_units(data.rings.near)
            const outerRadius = Utils.km_to_astronomical_units(data.rings.far)
            const thetaSegments = 100
            const phiSegments = 1

            this.rings = new THREE.Mesh(
                new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments, phiSegments),
                new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, transparent: true }))

            this.rings.rotateX(0.6 * Math.PI)

            let uvs = []
            for (let i = 0; i <= phiSegments; i++) {
                for (let j = 0; j <= thetaSegments; j++) {
                    uvs.push(i / phiSegments, j / thetaSegments)
                }
            }

            this.rings.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))

            const tex_color = ws.textureLoader.load(data.rings.tex_color)

            this.rings.material.map = tex_color

            ws.scene.add(this.rings)
        }

        // Lights
        if (data.type == 'star') {
            this.light = new THREE.PointLight('white', 3, 0, 0)
            ws.scene.add(this.light)
        }

        this.updateVisual()

        // Register body
        ws.body_map[this.name.toLowerCase()] = this
    }

    computeGravitationalForce() {
        this.acc = new THREE.Vector3(0, 0, 0)

        for (let planet of planets) {
            if (planet.name == this.name) continue

            const distance = this.pos.distanceTo(planet.pos)
            const F = universalGravitation(this.mass, planet.mass, distance)
            this.F = F

            const a = F / this.mass

            const acc_vector = new THREE.Vector3().subVectors(planet.pos, this.pos).normalize().multiplyScalar(a)
            this.acc.add(acc_vector)
        }
    }

    computeNextState() {
        this.acc = new THREE.Vector3(0, 0, 0)
        this.next_vel = new THREE.Vector3().addVectors(this.vel, this.acc).multiplyScalar(ws.delta)
        this.next_pos = new THREE.Vector3().addVectors(this.pos, this.next_vel)
    }

    applyNextState() {
        this.vel = this.next_vel
        this.pos = this.next_pos

        this.updateVisual()
    }

    updateVisual() {
        this.mesh.position.copy(this.pos)

        if (this.atmosphere) {
            this.atmosphere.position.copy(this.pos)

            const rotationSpeed = THREE.MathUtils.degToRad(1e-4 * 360)
            this.atmosphere.rotateY(rotationSpeed * ws.delta)
        }

        if (this.rings)
            this.rings.position.copy(this.pos)

        if (this.light)
            this.light.position.copy(this.pos)
    }

    get info() {
        return `Body: ${this.name}:\n` +
            `  mass: ${this.mass} M☉\n` +
            `radius: ${this.radius} au\n` +
            `  pos: ${this.pos.toArray().map(x => x.toFixed(4))} au\n` +
            `  vel: ${this.vel.toArray()}\n`
    }

}

export default Body
