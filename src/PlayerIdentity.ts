const ADJECTIVES = [
    'swift', 'silent', 'crimson', 'fuzzy', 'cosmic', 'lunar', 'solar',
    'stellar', 'amber', 'azure', 'bright', 'calm', 'dark', 'eager',
    'frosty', 'golden', 'hidden', 'iron', 'jade', 'keen', 'neon',
    'polar', 'rapid', 'serene', 'turbo', 'vivid', 'wild', 'zinc',
]

const NOUNS = [
    'orbit', 'nebula', 'comet', 'pulsar', 'quasar', 'photon', 'nova',
    'hawk', 'wolf', 'fox', 'lynx', 'raven', 'viper', 'falcon',
    'spark', 'drift', 'flare', 'surge', 'bolt', 'blaze', 'echo',
    'phantom', 'spectre', 'ranger', 'voyager', 'pioneer', 'atlas',
]

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function generateName(): string {
    return `${pick(ADJECTIVES)}-${pick(NOUNS)}`
}

const ID_KEY = 'solaris_player_id'
const NAME_KEY = 'solaris_username'

export function getIdentity(): { id: string; username: string } {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(ID_KEY, id)
    }

    let username = localStorage.getItem(NAME_KEY)
    if (!username) {
        username = generateName()
        localStorage.setItem(NAME_KEY, username)
    }

    return { id, username }
}

export function setUsername(name: string): void {
    localStorage.setItem(NAME_KEY, name)
}

export function getUsername(): string {
    return localStorage.getItem(NAME_KEY) ?? generateName()
}
