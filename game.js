const LAYOUT_RU = [
    ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],
    ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
    ["я", "ч", "с", "м", "и", "т", "ь", "б", "ю"]
];

const LAYOUT_EN = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
    ["z", "x", "c", "v", "b", "n", "m", ",", "."]
];

// Mapper for finger assignment (1-10, from left pinky to right pinky)
const FINGER_MAP = {
    // RU
    'ф': 1, 'ы': 2, 'в': 3, 'а': 4, 'п': 4,
    'р': 7, 'о': 7, 'л': 8, 'д': 9, 'ж': 10, 'э': 10,
    'й': 1, 'ц': 2, 'у': 3, 'к': 4, 'е': 4,
    'н': 7, 'г': 7, 'ш': 8, 'щ': 9, 'з': 10, 'х': 10, 'ъ': 10,
    'я': 1, 'ч': 2, 'с': 3, 'м': 4, 'и': 4,
    'т': 7, 'ь': 7, 'б': 8, 'ю': 9, '.': 10,
};

const FINGER_NAMES = [
    "Левый мизинец", "Левый безымянный", "Левый средний", "Левый указательный", "Большой палец",
    "Большой палец", "Правый указательный", "Правый средний", "Правый безымянный", "Правый мизинец"
];

class Game {
    constructor() {
        this.level = 1;
        this.score = 0;
        this.errors = 0;
        this.totalKeystrokes = 0;
        this.startTime = null;
        this.isPlaying = false;
        this.entities = [];
        this.charPool = "ао";
        this.spawnRate = 2000; // ms
        this.fallSpeed = 2; // pixels per frame
        this.lastSpawnTime = 0;

        this.dom = {
            gameArea: document.getElementById('game-area'),
            entitiesContainer: document.getElementById('entities-container'),
            level: document.getElementById('level-display'),
            cpm: document.getElementById('cpm-display'),
            accuracy: document.getElementById('accuracy-display'),
            errors: document.getElementById('errors-display'),
            startScreen: document.getElementById('start-screen'),
            keyboard: document.getElementById('virtual-keyboard'),
            fingerHint: document.getElementById('finger-text')
        };

        this.init();
    }

    init() {
        this.renderKeyboard();
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    renderKeyboard() {
        this.dom.keyboard.innerHTML = '';
        LAYOUT_RU.forEach((row, i) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'kb-row';
            row.forEach((key, j) => {
                const keyEl = document.createElement('div');
                keyEl.className = 'key';
                keyEl.id = `key-${key}`;
                keyEl.innerText = key.toUpperCase();
                
                // Add secondary EN char
                const enChar = LAYOUT_EN[i][j];
                if (enChar) {
                    const secondary = document.createElement('span');
                    secondary.className = 'secondary';
                    secondary.innerText = enChar.toUpperCase();
                    keyEl.appendChild(secondary);
                    keyEl.setAttribute('data-en', enChar);
                }

                rowEl.appendChild(keyEl);
            });
            this.dom.keyboard.appendChild(rowEl);
        });
    }

    start() {
        this.isPlaying = true;
        this.startTime = Date.now();
        this.score = 0;
        this.errors = 0;
        this.totalKeystrokes = 0;
        this.entities = [];
        this.dom.entitiesContainer.innerHTML = '';
        this.dom.startScreen.classList.add('hidden');
        this.updateStats();
    }

    spawnEntity() {
        const char = this.charPool[Math.floor(Math.random() * this.charPool.length)];
        const el = document.createElement('div');
        el.className = 'letter-entity';
        el.innerText = char.toUpperCase();
        
        const x = 50 + Math.random() * (this.dom.gameArea.clientWidth - 100);
        el.style.left = `${x}px`;
        el.style.top = '-50px';
        
        const entity = {
            element: el,
            char: char,
            y: -50,
            dead: false
        };

        this.dom.entitiesContainer.appendChild(el);
        this.entities.push(entity);
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !this.isPlaying) {
            this.start();
            return;
        }

        if (!this.isPlaying) return;

        const key = e.key.toLowerCase();
        let matched = false;

        // Try to find the entity
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            // Match against RU or EN (using data-en attribute of keys if needed, but easier to just check char)
            const targetChar = entity.char;
            const targetEn = document.getElementById(`key-${targetChar}`)?.getAttribute('data-en');

            if (key === targetChar || key === targetEn) {
                this.hitEntity(entity);
                matched = true;
                this.totalKeystrokes++;
                break;
            }
        }

        if (!matched) {
            if (this.isPrintable(e.key)) {
                this.errors++;
                this.totalKeystrokes++;
                this.flashError(key);
            }
        }

        this.highlightKey(key);
        this.updateStats();
        this.checkLevelUp();
    }

    isPrintable(key) {
        return key.length === 1;
    }

    hitEntity(entity) {
        // Mark as dead and trigger hit animation
        entity.dead = true;
        entity.element.classList.add('hit');
        this.score++;
        // Remove element after animation and clean up entities array
        setTimeout(() => {
            if (entity.element.parentNode) {
                entity.element.parentNode.removeChild(entity.element);
            }
            // Remove from entities list to prevent lingering dead entities
            this.entities = this.entities.filter(e => e !== entity);
        }, 300);
    }

    flashError(key) {
        // Find key element (either RU or EN)
        const keyEl = [...document.querySelectorAll('.key')].find(el => 
            el.id === `key-${key}` || el.getAttribute('data-en') === key
        );
        if (keyEl) {
            keyEl.classList.add('error');
            setTimeout(() => keyEl.classList.remove('error'), 200);
        }
    }

    highlightKey(key) {
        const keyEl = [...document.querySelectorAll('.key')].find(el => 
            el.id === `key-${key}` || el.getAttribute('data-en') === key
        );
        if (keyEl) {
            keyEl.classList.add('active');
            setTimeout(() => keyEl.classList.remove('active'), 150);
            
            // Update finger hint
            const ruChar = keyEl.id.replace('key-', '');
            const fingerIndex = FINGER_MAP[ruChar];
            if (fingerIndex) {
                this.dom.fingerHint.innerText = FINGER_NAMES[fingerIndex - 1];
            }
        }
    }

    updateStats() {
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        const cpm = elapsedMinutes > 0 ? Math.round(this.totalKeystrokes / elapsedMinutes) : 0;
        const accuracy = this.totalKeystrokes > 0 ? Math.round(((this.totalKeystrokes - this.errors) / this.totalKeystrokes) * 100) : 100;

        this.dom.cpm.innerText = cpm;
        this.dom.accuracy.innerText = `${accuracy}%`;
        this.dom.errors.innerText = this.errors;
        this.dom.level.innerText = this.level;
    }

    checkLevelUp() {
        // Level up every 20 hits
        if (this.score > 0 && this.score % 20 === 0 && this.level < 10) {
            this.level++;
            this.updateCharPool();
            this.fallSpeed += 0.2;
            this.spawnRate = Math.max(800, this.spawnRate - 100);
        }
    }

    updateCharPool() {
        const allChars = "аовылдфжпрэкукенгшщзхъячсмитьбю";
        this.charPool = allChars.substring(0, this.level * 3);
    }

    gameLoop(time) {
        if (this.isPlaying) {
            if (time - this.lastSpawnTime > this.spawnRate) {
                this.spawnEntity();
                this.lastSpawnTime = time;
            }

            this.entities.forEach((entity, index) => {
                if (!entity.dead) {
                    entity.y += this.fallSpeed;
                    entity.element.style.top = `${entity.y}px`;

                    if (entity.y > this.dom.gameArea.clientHeight) {
                        this.errors++;
                        this.updateStats();
                        this.dom.entitiesContainer.removeChild(entity.element);
                        this.entities.splice(index, 1);
                    }
                }
            });

            // Cleanup dead entities
            this.entities = this.entities.filter(e => !e.dead || e.y < this.dom.gameArea.clientHeight);
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

new Game();
