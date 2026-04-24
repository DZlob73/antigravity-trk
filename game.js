const LAYOUT_RU = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],
    ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
    ["я", "ч", "с", "м", "и", "т", "ь", "б", "ю"]
];

const SHIFT_LAYOUT_RU = [
    ["!", "\"", "№", ";", "%", ":", "?", "*", "(", ")"],
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
    ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
    ["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю"]
];

const LAYOUT_EN = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
    ["z", "x", "c", "v", "b", "n", "m", ",", "."]
];

const SHIFT_LAYOUT_EN = [
    ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "\""],
    ["Z", "X", "C", "V", "B", "N", "M", "<", ">"]
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
    // EN
    'a': 1, 's': 2, 'd': 3, 'f': 4, 'g': 4,
    'h': 7, 'j': 7, 'k': 8, 'l': 9, ';': 10, "'": 10,
    'q': 1, 'w': 2, 'e': 3, 'r': 4, 't': 4,
    'y': 7, 'u': 7, 'i': 8, 'o': 9, 'p': 10, '[': 10, ']': 10,
    'z': 1, 'x': 2, 'c': 3, 'v': 4, 'b': 4,
    'n': 7, 'm': 7, ',': 8, '.': 9, '/': 10,
    // Numbers
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 4,
    '6': 7, '7': 7, '8': 8, '9': 9, '0': 10
};

// Add uppercase and symbols to FINGER_MAP
Object.keys(FINGER_MAP).forEach(key => {
    FINGER_MAP[key.toUpperCase()] = FINGER_MAP[key];
});

const CHAR_POOLS = {
    ru: "аовылдфжпрэкукенгшщзхъячсмитьбю",
    en: "asdfghjkl;qwertyuiop[]zxcvbnm,."
};

// Global map to link RU and EN characters on the same physical key
const KEY_MAP = {}; 
[LAYOUT_RU, SHIFT_LAYOUT_RU].forEach((layout, lIdx) => {
    layout.forEach((row, i) => {
        row.forEach((ruChar, j) => {
            const enLayout = lIdx === 0 ? LAYOUT_EN : SHIFT_LAYOUT_EN;
            const enChar = enLayout[i] ? enLayout[i][j] : null;
            const entry = { ru: ruChar, en: enChar, isShift: lIdx === 1 };
            KEY_MAP[ruChar] = entry;
            if (enChar) KEY_MAP[enChar] = entry;
        });
    });
});

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
        this.language = 'ru';
        this.entities = [];
        this.charPool = "ао";
        this.spawnRate = 2000; // ms
        this.fallSpeed = 2; // pixels per frame
        this.lastSpawnTime = 0;
        this.shiftPressed = false;

        this.dom = {
            gameArea: document.getElementById('game-area'),
            entitiesContainer: document.getElementById('entities-container'),
            level: document.getElementById('level-display'),
            cpm: document.getElementById('cpm-display'),
            accuracy: document.getElementById('accuracy-display'),
            errors: document.getElementById('errors-display'),
            startScreen: document.getElementById('start-screen'),
            keyboard: document.getElementById('virtual-keyboard'),
            fingerHint: document.getElementById('finger-text'),
            langToggle: document.getElementById('lang-toggle')
        };

        this.init();
    }

    init() {
        this.renderKeyboard();
        // Listen for keydown for gameplay and start trigger
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.shiftPressed = true;
                this.renderKeyboard();
            }
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.shiftPressed = false;
                this.renderKeyboard();
            }
        });
        
        if (this.dom.langToggle) {
            this.dom.langToggle.addEventListener('click', () => {
                this.toggleLanguage();
                this.dom.langToggle.blur(); // Remove focus to prevent Enter from re-triggering the click
            });
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    renderKeyboard() {
        this.dom.keyboard.innerHTML = '';
        const isRu = this.language === 'ru';
        const currentLayout = isRu ? (this.shiftPressed ? SHIFT_LAYOUT_RU : LAYOUT_RU) : (this.shiftPressed ? SHIFT_LAYOUT_EN : LAYOUT_EN);
        const secondaryLayout = isRu ? (this.shiftPressed ? SHIFT_LAYOUT_EN : LAYOUT_EN) : (this.shiftPressed ? SHIFT_LAYOUT_RU : LAYOUT_RU);

        currentLayout.forEach((row, i) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'kb-row';

            // Add Shift key to the last row
            if (i === 3) {
                const shiftEl = document.createElement('div');
                shiftEl.className = `key shift-key ${this.shiftPressed ? 'active' : ''}`;
                shiftEl.innerText = 'Shift';
                rowEl.appendChild(shiftEl);
            }

            row.forEach((key, j) => {
                const keyEl = document.createElement('div');
                keyEl.className = 'key';
                
                const primaryChar = key;
                const secondaryChar = secondaryLayout[i] ? secondaryLayout[i][j] : null;
                
                const ruKeyChar = isRu ? primaryChar : secondaryChar;
                keyEl.id = `key-${ruKeyChar}`; 
                keyEl.setAttribute('data-char', primaryChar);

                // Show letter only if it participates in training
                const pool = this.charPool + this.charPool.toUpperCase();
                if (pool.includes(primaryChar)) {
                    keyEl.innerText = primaryChar;
                    if (secondaryChar) {
                        const secondary = document.createElement('span');
                        secondary.className = 'secondary';
                        secondary.innerText = secondaryChar;
                        keyEl.appendChild(secondary);
                    }
                } else {
                    keyEl.innerText = '';
                }

                rowEl.appendChild(keyEl);
            });

            // Add second Shift key to the last row
            if (i === 3) {
                const shiftEl = document.createElement('div');
                shiftEl.className = `key shift-key ${this.shiftPressed ? 'active' : ''}`;
                shiftEl.innerText = 'Shift';
                rowEl.appendChild(shiftEl);
            }

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
        let char = this.charPool[Math.floor(Math.random() * this.charPool.length)];
        // 30% chance for uppercase if level > 2
        if (this.level > 2 && Math.random() > 0.7) {
            char = char.toUpperCase();
        }

        const el = document.createElement('div');
        el.className = 'letter-entity';
        el.innerText = char;
        
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

        if (!this.isPlaying || e.key === 'Shift') return;

        const key = e.key; // Keep original case
        let matched = false;

        // Try to find the entity
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            const mapping = KEY_MAP[entity.char];
            
            // Check for direct match or cross-language match
            if (key === entity.char || (mapping && (key === mapping.ru || key === mapping.en))) {
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

    toggleLanguage() {
        this.language = this.language === 'ru' ? 'en' : 'ru';
        if (this.dom.langToggle) {
            this.dom.langToggle.innerText = this.language.toUpperCase();
        }
        
        // Reset game on language change for consistency
        this.isPlaying = false;
        this.level = 1;
        this.entities = [];
        this.dom.entitiesContainer.innerHTML = '';
        this.dom.startScreen.classList.remove('hidden');
        
        this.updateCharPool();
        this.renderKeyboard();
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
        const mapping = KEY_MAP[key];
        if (!mapping) return;

        // Always highlight the base RU key element for position consistency
        // But for uppercase/symbols, we need to map back to lowercase for ID
        const baseRu = mapping.ru.toLowerCase();
        const keyEl = document.getElementById(`key-${mapping.ru}`) || document.getElementById(`key-${baseRu}`);
        
        if (keyEl) {
            keyEl.classList.add('active');
            setTimeout(() => keyEl.classList.remove('active'), 150);
            
            // Update finger hint
            const fingerIndex = FINGER_MAP[mapping.ru] || FINGER_MAP[mapping.en];
            if (fingerIndex) {
                this.dom.fingerHint.innerText = FINGER_NAMES[fingerIndex - 1];
            }
        }
    }

    updateStats() {
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        const cpm = elapsedMinutes > 0 ? Math.round(this.totalKeystrokes / elapsedMinutes) : 0;
        
        const totalActions = this.score + this.errors;
        const accuracy = totalActions > 0 ? Math.round((this.score / totalActions) * 100) : 100;

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
        const pool = CHAR_POOLS[this.language];
        this.charPool = pool.substring(0, this.level * 3);
        // Re-render the keyboard to reflect newly added training letters
        this.renderKeyboard();
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
