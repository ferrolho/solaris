/**
 * Tracks continuous keyboard state for ship controls.
 * Uses keydown/keyup to maintain a Set of currently-held keys.
 */
export class InputManager {
    readonly keysDown = new Set<string>()

    constructor() {
        window.addEventListener('keydown', (e) => {
            this.keysDown.add(e.key)
        })
        window.addEventListener('keyup', (e) => {
            this.keysDown.delete(e.key)
        })
        // Clear all keys when window loses focus to avoid stuck keys
        window.addEventListener('blur', () => {
            this.keysDown.clear()
        })
    }

    isDown(key: string): boolean {
        return this.keysDown.has(key)
    }
}
