import * as THREE from 'three'
import * as Utils from './Utilities'
import * as ws from './Workspace'
import { createSunMaterial, createCoronaMaterial } from './SunMaterial'
import type { BodyData } from './SIConstants'

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

            const uvs: number[] = []
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

        if (this.atmosphere) {
            this.atmosphere.position.copy(this.pos)

            const rotationSpeed = THREE.MathUtils.degToRad(1e-4 * 360)
            this.atmosphere.rotateY(rotationSpeed * ws.delta)
        }

        if (this.rings)
            this.rings.position.copy(this.pos)

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
