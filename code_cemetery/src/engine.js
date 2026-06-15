/**
 * Code_Cemetery: Vitt's Journey - Engine Module
 * 
 * Manages the HTML5 Canvas, loop, input tracking, screen effects, and particle physics.
 */

class VirtualContext {
    constructor(engine) {
        this.engine = engine;
        this._fillStyle = '#00ff66';
        this._strokeStyle = '#00ff66';
        this._font = '12px Courier New';
        this._lineWidth = 1;
        this._textAlign = 'left';
        this._textBaseline = 'alphabetic';
        this._shadowBlur = 0;
        this._shadowColor = 'transparent';
        this._translateX = 0;
        this._translateY = 0;
        this._rotation = 0;
        this._stateStack = [];
    }

    get fillStyle() { return this._fillStyle; }
    set fillStyle(val) {
        this._fillStyle = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.fillStyle = val;
    }

    get strokeStyle() { return this._strokeStyle; }
    set strokeStyle(val) {
        this._strokeStyle = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.strokeStyle = val;
    }

    get font() { return this._font; }
    set font(val) {
        this._font = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.font = val;
    }

    get lineWidth() { return this._lineWidth; }
    set lineWidth(val) {
        this._lineWidth = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.lineWidth = val;
    }

    get textAlign() { return this._textAlign; }
    set textAlign(val) {
        this._textAlign = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.textAlign = val;
    }

    get textBaseline() { return this._textBaseline; }
    set textBaseline(val) {
        this._textBaseline = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.textBaseline = val;
    }

    get shadowBlur() { return this._shadowBlur; }
    set shadowBlur(val) {
        this._shadowBlur = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.shadowBlur = val;
    }

    get shadowColor() { return this._shadowColor; }
    set shadowColor(val) {
        this._shadowColor = val;
        if (this.engine.dynamicCtx) this.engine.dynamicCtx.shadowColor = val;
    }

    fillText(text, x, y) {
        if (this._rotation !== 0 || this._translateX !== 0 || this._translateY !== 0) {
            if (this.engine.dynamicCtx) {
                this.engine.dynamicCtx.fillText(text, x, y);
            }
        } else {
            let col = Math.round(x / 10);
            const row = Math.round(y / 20);
            
            if (this._textAlign === 'right') {
                col -= text.length;
            } else if (this._textAlign === 'center') {
                col -= Math.round(text.length / 2);
            }
            
            for (let i = 0; i < text.length; i++) {
                const c = col + i;
                if (c >= 0 && c < 80 && row >= 0 && row < 30) {
                    this.engine.setGridCell(c, row, text[i], this._fillStyle);
                }
            }
        }
    }

    fillRect(x, y, w, h) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.fillRect(x, y, w, h);
        }
    }

    strokeRect(x, y, w, h) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.strokeRect(x, y, w, h);
        }
    }

    clearRect(x, y, w, h) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.clearRect(x, y, w, h);
        }
    }

    beginPath() {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.beginPath();
        }
    }

    moveTo(x, y) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.moveTo(x, y);
        }
    }

    lineTo(x, y) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.lineTo(x, y);
        }
    }

    arc(x, y, r, startAngle, endAngle) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.arc(x, y, r, startAngle, endAngle, false);
        }
    }

    stroke() {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.stroke();
        }
    }

    fill() {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.fill();
        }
    }

    save() {
        this._stateStack.push({
            translateX:    this._translateX,
            translateY:    this._translateY,
            rotation:      this._rotation,
            fillStyle:     this._fillStyle,
            strokeStyle:   this._strokeStyle,
            font:          this._font,
            lineWidth:     this._lineWidth,
            textAlign:     this._textAlign,
            textBaseline:  this._textBaseline,
            shadowBlur:    this._shadowBlur,
            shadowColor:   this._shadowColor
        });
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.save();
        }
    }

    restore() {
        if (this._stateStack.length > 0) {
            const state = this._stateStack.pop();
            this._translateX   = state.translateX;
            this._translateY   = state.translateY;
            this._rotation     = state.rotation;
            this._fillStyle    = state.fillStyle;
            this._strokeStyle  = state.strokeStyle;
            this._font         = state.font;
            this._lineWidth    = state.lineWidth;
            this._textAlign    = state.textAlign;
            this._textBaseline = state.textBaseline;
            this._shadowBlur   = state.shadowBlur;
            this._shadowColor  = state.shadowColor;
            if (this.engine.dynamicCtx) {
                this.engine.dynamicCtx.fillStyle   = this._fillStyle;
                this.engine.dynamicCtx.strokeStyle = this._strokeStyle;
                this.engine.dynamicCtx.font        = this._font;
                this.engine.dynamicCtx.lineWidth   = this._lineWidth;
                this.engine.dynamicCtx.textAlign   = this._textAlign;
                this.engine.dynamicCtx.textBaseline= this._textBaseline;
                this.engine.dynamicCtx.shadowBlur  = this._shadowBlur;
                this.engine.dynamicCtx.shadowColor = this._shadowColor;
            }
        } else {
            this._translateX   = 0;
            this._translateY   = 0;
            this._rotation     = 0;
        }
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.restore();
        }
    }

    translate(x, y) {
        this._translateX += x;
        this._translateY += y;
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.translate(x, y);
        }
    }

    scale(x, y) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.scale(x, y);
        }
    }

    rotate(angle) {
        this._rotation += angle;
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.rotate(angle);
        }
    }

    drawImage(img, x, y) {
        if (this.engine.dynamicCtx) {
            this.engine.dynamicCtx.drawImage(img, x, y);
        }
    }

    setLineDash(segments) {
        if (this.engine.dynamicCtx && typeof this.engine.dynamicCtx.setLineDash === 'function') {
            this.engine.dynamicCtx.setLineDash(segments);
        }
    }
}

window.GameEngine = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    keys: {},
    camera: { x: 0, y: 0 },
    shakeForce: 0,
    isFrozen: false,
    particles: [],

    // Grid screen buffer structures
    grid: [],
    walls: [],
    damageFlashTimer: 0,
    decayRate: 0.25,
    virtualCtx: null,
    lastTime: 0,
    running: false,
    flashOpacity: 0,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.setupInput();
        this.initWalls();
        this.virtualCtx = new VirtualContext(this);
        
        // Initialize static canvas for pre-rendering walls and dots
        this.initStaticCanvas();

        // Initialize dynamic canvas for player, enemies, slashes, particles (phosphor trails)
        this.dynamicCanvas = document.createElement('canvas');
        this.dynamicCanvas.width = 800;
        this.dynamicCanvas.height = 600;
        this.dynamicCtx = this.dynamicCanvas.getContext('2d');

        // Initialize 80x30 screen buffer
        this.grid = Array.from({ length: 30 }, () => Array.from({ length: 80 }, () => ({
            char: ' ',
            color: '#00ff66',
            bgColor: '#030508'
        })));
        
        console.log("Game Engine Initialized");
    },

    initStaticCanvas() {
        this.staticCanvas = document.createElement('canvas');
        this.staticCanvas.width = 800;
        this.staticCanvas.height = 600;
        const sCtx = this.staticCanvas.getContext('2d');
        
        sCtx.fillStyle = '#030508';
        sCtx.fillRect(0, 0, 800, 600);
        
        sCtx.font = 'bold 14px "Courier Prime", monospace';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        
        // Draw background dots
        for (let r = 3; r <= 27; r++) {
            for (let c = 0; c < 80; c++) {
                const isDot = (r % 2 === 0 && c % 4 === 0);
                if (isDot && !this.walls[r][c]) {
                    sCtx.fillStyle = 'rgba(0, 255, 102, 0.05)';
                    sCtx.fillText('.', c * 10 + 5, r * 20 + 10);
                }
            }
        }
        
        // Draw walls (solid platform paths)
        for (let r = 3; r <= 27; r++) {
            for (let c = 0; c < 80; c++) {
                if (this.walls[r][c]) {
                    sCtx.fillStyle = 'rgba(0, 255, 102, 0.4)';
                    sCtx.fillText('#', c * 10 + 5, r * 20 + 10);
                }
            }
        }
    },

    initWalls() {
        // Redesigned Level 1 'SWAP Space' layout
        // Vitt spawns at gridX = 5, gridY = 5 (row 5, col 10/11)
        const layout = [
            "################################################################################",
            "################################################################################",
            "################################################################################",
            "###   ##########################             ###################################",
            "###   ##########################             ###################################",
            "################################             ###################################",
            "################################             ###################################",
            "#################         ######             ######        #####################",
            "#################         ######             ######        #####################",
            "######   ########         ######             ######        ########   ##########",
            "######   ########         ######             ######        ########   ##########",
            "######   ########         #########################        ########   ##########",
            "######   ########         #########################        ########   ##########",
            "######   ########                  ######                  ########   ##########",
            "######   ########                  ######                  ########   ##########",
            "######   #################         ######         #################   ##########",
            "######   #################         ######         #################   ##########",
            "######            ########         ######         ########            ##########",
            "######            ########         ######         ########            ##########",
            "######            ########         ######         ########            ##########",
            "######            ########         ######         ########            ##########",
            "##########################         ######         ##############################",
            "##########################         ######         ##############################",
            "######   ########                  ######                  ########   ##########",
            "######   ########                  ######                  ########   ##########",
            "######   ########         #########################        ########   ##########",
            "######   ########         #########################        ########   ##########",
            "######   ########         ######             ######        ########   ##########",
            "################################################################################",
            "################################################################################"
        ];
        this.walls = [];
        for (let r = 0; r < 30; r++) {
            this.walls[r] = [];
            for (let c = 0; c < 80; c++) {
                this.walls[r][c] = (layout[r][c] === '#');
            }
        }
    },

    setupInput() {
        window.addEventListener('keydown', (e) => {
            if (e.key && typeof e.key === 'string') {
                this.keys[e.key.toUpperCase()] = true;
            }
            this.keys[e.code] = true; // Support codes like 'Space' or 'ShiftLeft'
        });
        window.addEventListener('keyup', (e) => {
            if (e.key && typeof e.key === 'string') {
                this.keys[e.key.toUpperCase()] = false;
            }
            this.keys[e.code] = false;
        });
    },

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        const loop = (time) => {
            if (!this.running) return;
            requestAnimationFrame(loop);
            
            let dt = (time - this.lastTime) / 1000;
            this.lastTime = time;
            
            if (dt > 0.1) dt = 0.1; // clamp delta time
            
            this.tick(dt);
        };
        requestAnimationFrame(loop);
    },

    shake(force) {
        if (window.graphicsProfile === 'low') {
            this.shakeForce = 0;
        } else {
            this.shakeForce = force;
        }
    },

    hitStop(duration) {
        this.isFrozen = true;
        setTimeout(() => { this.isFrozen = false; }, duration);
    },

    triggerDamage() {
        this.damageFlashTimer = 15;
        this.shake(8);
    },

    isTileVoid(col, row) {
        if (col < 0 || col >= 40 || row < 0 || row >= 30) return true;
        const c1 = col * 2;
        const c2 = col * 2 + 1;
        const isPlatform = (this.walls[row] && (this.walls[row][c1] || this.walls[row][c2]));
        return !isPlatform;
    },

    spawnParticles(x, y, color, count) {
        if (window.graphicsProfile === 'low') return;
        const hexChars = '0123456789ABCDEF';
        const numParticles = count || 10;
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            const life = 30 + Math.random() * 30;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                char: hexChars[Math.floor(Math.random() * hexChars.length)],
                color: color || '#00ff66',
                life: life,
                maxLife: life,
                friction: 0.95 + Math.random() * 0.04,
                gravity: 0.1 + Math.random() * 0.1
            });
        }
    },

    updateParticles(dt) {
        const hexChars = '0123456789ABCDEF';
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt * 60;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            if (Math.random() < 0.15) {
                p.char = hexChars[Math.floor(Math.random() * hexChars.length)];
            }
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
        }
    },

    clearGrid() {
        for (let r = 0; r < 30; r++) {
            for (let c = 0; c < 80; c++) {
                this.grid[r][c] = {
                    char: ' ',
                    color: 'rgba(0, 255, 102, 0.05)',
                    bgColor: '#030508'
                };
            }
        }
    },

    drawWallsToGrid() {
        // No-op: Walls are now pre-rendered on the static canvas
    },

    setGridCell(col, row, char, color, bgColor) {
        if (col >= 0 && col < 80 && row >= 0 && row < 30) {
            const cell = this.grid[row][col];
            cell.char = char || ' ';
            if (color) cell.color = color;
            if (bgColor) cell.bgColor = bgColor;
        }
    },

    checkGridCollision(x, y, width, height) {
        const startCol = Math.floor(x / 10);
        const endCol = Math.floor((x + width - 0.01) / 10);
        const startRow = Math.floor(y / 20);
        const endRow = Math.floor((y + height - 0.01) / 20);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (c < 0 || c >= 80 || r < 0 || r >= 30) {
                    return true;
                }
                if (this.walls[r] && this.walls[r][c]) {
                    return true;
                }
            }
        }
        return false;
    },

    isWall(col, row) {
        if (col < 0 || col >= 80 || row < 0 || row >= 30) return true;
        return !!this.walls[row][col];
    },

    tick(dt) {
        // Camera shake decay
        if (this.shakeForce > 0) {
            this.shakeForce -= dt * 20;
            if (this.shakeForce < 0) this.shakeForce = 0;
        }

        // Update modules
        if (!this.isFrozen) {
            if (window.Vitt && typeof window.Vitt.update === 'function') {
                window.Vitt.update(dt);
                
                // SegFault Exception Handler (Void stepping check)
                if (this.isTileVoid(window.Vitt.gridX, window.Vitt.gridY)) {
                    // 1. Screen chromatic aberration & flash
                    this.triggerDamage();
                    this.flashOpacity = 0.6; // Trigger red flash overlay
                    
                    // 2. Apply 5% integrity damage
                    window.Vitt.integrity = Math.max(0, window.Vitt.integrity - 5);
                    
                    // 3. Instantly reset Vitt's position to the last safe grid cell
                    window.Vitt.gridX = window.Vitt.lastSafeGridX || 5;
                    window.Vitt.gridY = window.Vitt.lastSafeGridY || 5;
                    window.Vitt.x = window.Vitt.gridX * window.Vitt.TILE_SIZE;
                    window.Vitt.y = window.Vitt.gridY * window.Vitt.TILE_SIZE;
                    window.Vitt.targetX = window.Vitt.x;
                    window.Vitt.targetY = window.Vitt.y;
                    
                    // 4. Trigger playHit sound and display floating text popups
                    if (window.GameAudio && typeof window.GameAudio.playHit === 'function') {
                        window.GameAudio.playHit();
                    }
                    if (typeof window.Vitt.showTextEffect === 'function') {
                        window.Vitt.showTextEffect("SEGFAULT: NULL_PTR", "#ff0055");
                    }
                    
                    // Trigger game over if integrity hits zero
                    if (window.Vitt.integrity <= 0 && window.triggerGameOver) {
                        window.triggerGameOver();
                    }
                } else {
                    // Update safe position coordinates when standing on platform
                    window.Vitt.lastSafeGridX = window.Vitt.gridX;
                    window.Vitt.lastSafeGridY = window.Vitt.gridY;
                }
            }
            if (window.Enemies && typeof window.Enemies.update === 'function') {
                window.Enemies.update(dt);
            }
        }

        this.updateParticles(dt);
        this.render();
    },

    render() {
        // 1. Ghosting decay on the dynamic canvas (fades previous frames out using destination-out)
        this.dynamicCtx.globalCompositeOperation = 'destination-out';
        this.dynamicCtx.fillStyle = `rgba(0, 0, 0, ${this.decayRate})`;
        this.dynamicCtx.fillRect(0, 0, 800, 600);
        this.dynamicCtx.globalCompositeOperation = 'source-over';

        // 2. Reset grid buffer
        this.clearGrid();

        // 3. Let components draw to virtualCtx (which writes characters to the grid)
        if (window.Vitt && typeof window.Vitt.draw === 'function') {
            window.Vitt.draw(this.virtualCtx);
        }
        if (window.Enemies && typeof window.Enemies.draw === 'function') {
            window.Enemies.draw(this.virtualCtx);
        }

        // 4. Render text grid cells onto the dynamic canvas buffer
        this.renderGrid(this.dynamicCtx);

        // 5. Render particles onto the dynamic canvas buffer
        this.renderParticles(this.dynamicCtx);

        // 6. Composite the canvases onto the main screen
        // Draw the static walls and background dots
        this.ctx.drawImage(this.staticCanvas, 0, 0);

        // Draw the dynamic entities and trails on top
        this.ctx.drawImage(this.dynamicCanvas, 0, 0);

        // Render damage flash overlay
        if (this.flashOpacity > 0) {
            this.ctx.fillStyle = `rgba(255, 0, 85, ${this.flashOpacity})`;
            this.ctx.fillRect(0, 0, 800, 600);
            this.flashOpacity -= 0.05; // Fade out
        }

        // 7. HUD overlays (dialogue, minigames) — drawn AFTER compositing on main canvas
        //    This guarantees they appear on top of everything, using real pixel coordinates.
        if (window.Enemies && typeof window.Enemies.drawHUD === 'function') {
            window.Enemies.drawHUD(this.ctx);
        }

        // 8. Overlay scanlines and ambient screen hum on the main canvas
        this.renderScanlinesAndHum();
    },

    renderGrid(ctx) {
        ctx.font = 'bold 14px "Courier Prime", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let offset = 0;
        if (window.graphicsProfile !== 'low') {
            if (this.shakeForce > 0) {
                offset += Math.ceil(this.shakeForce * 0.4);
            }
            if (this.damageFlashTimer > 0) {
                offset += 2;
                this.damageFlashTimer--;
            }
        } else {
            if (this.damageFlashTimer > 0) {
                this.damageFlashTimer--;
            }
        }

        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeForce > 0) {
            shakeX = (Math.random() - 0.5) * this.shakeForce;
            shakeY = (Math.random() - 0.5) * this.shakeForce;
        }

        // Draw black background masks for any dynamic text/entities to block out static background walls (#) and dots (.)
        ctx.fillStyle = '#030508';
        for (let r = 0; r < 30; r++) {
            for (let c = 0; c < 80; c++) {
                const cell = this.grid[r][c];
                if (cell.char !== ' ') {
                    ctx.fillRect(c * 10 + shakeX, r * 20 + shakeY, 10, 20);
                }
            }
        }

        if (offset > 0) {
            ctx.globalCompositeOperation = 'screen';
            
            // Pass 1: Red channel
            for (let r = 0; r < 30; r++) {
                for (let c = 0; c < 80; c++) {
                    const cell = this.grid[r][c];
                    if (cell.char !== ' ') {
                        ctx.fillStyle = 'rgba(255, 0, 85, 0.8)';
                        ctx.fillText(cell.char, c * 10 + 5 + shakeX + offset, r * 20 + 10 + shakeY);
                    }
                }
            }

            // Pass 2: Blue/Cyan channel
            for (let r = 0; r < 30; r++) {
                for (let c = 0; c < 80; c++) {
                    const cell = this.grid[r][c];
                    if (cell.char !== ' ') {
                        ctx.fillStyle = 'rgba(0, 242, 254, 0.8)';
                        ctx.fillText(cell.char, c * 10 + 5 + shakeX - offset, r * 20 + 10 + shakeY);
                    }
                }
            }

            // Pass 3: Green/Original channel
            for (let r = 0; r < 30; r++) {
                for (let c = 0; c < 80; c++) {
                    const cell = this.grid[r][c];
                    if (cell.char !== ' ') {
                        ctx.fillStyle = cell.color;
                        ctx.fillText(cell.char, c * 10 + 5 + shakeX, r * 20 + 10 + shakeY);
                    }
                }
            }
            ctx.globalCompositeOperation = 'source-over';
        } else {
            // Normal pass
            for (let r = 0; r < 30; r++) {
                for (let c = 0; c < 80; c++) {
                    const cell = this.grid[r][c];
                    if (cell.bgColor && cell.bgColor !== '#030508' && cell.bgColor !== 'transparent') {
                        ctx.fillStyle = cell.bgColor;
                        ctx.fillRect(c * 10 + shakeX, r * 20 + shakeY, 10, 20);
                    }
                    if (cell.char !== ' ') {
                        ctx.fillStyle = cell.color;
                        ctx.fillText(cell.char, c * 10 + 5 + shakeX, r * 20 + 10 + shakeY);
                    }
                }
            }
        }
    },

    renderParticles(ctx) {
        ctx.font = 'bold 12px "Courier Prime", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let offset = 0;
        if (this.shakeForce > 0) {
            offset += Math.ceil(this.shakeForce * 0.4);
        }
        if (this.damageFlashTimer > 0) {
            offset += 2;
        }

        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeForce > 0) {
            shakeX = (Math.random() - 0.5) * this.shakeForce;
            shakeY = (Math.random() - 0.5) * this.shakeForce;
        }

        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            if (offset > 0) {
                ctx.globalCompositeOperation = 'screen';
                
                // Red pass
                ctx.fillStyle = `rgba(255, 0, 85, ${alpha * 0.8})`;
                ctx.fillText(p.char, p.x + shakeX + offset, p.y + shakeY);

                // Cyan pass
                ctx.fillStyle = `rgba(0, 242, 254, ${alpha * 0.8})`;
                ctx.fillText(p.char, p.x + shakeX - offset, p.y + shakeY);

                // Original/Green pass
                ctx.fillStyle = `rgba(0, 255, 102, ${alpha})`;
                ctx.fillText(p.char, p.x + shakeX, p.y + shakeY);

                ctx.globalCompositeOperation = 'source-over';
            } else {
                ctx.fillStyle = `rgba(0, 255, 102, ${alpha})`;
                ctx.fillText(p.char, p.x + shakeX, p.y + shakeY);
            }
        });
    },

    renderScanlinesAndHum() {
        if (window.graphicsProfile === 'low') return;
        const ctx = this.ctx;
        
        // Horizontal Scanlines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1;
        for (let y = 0; y < 600; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(800, y);
            ctx.stroke();
        }

        // Ambient Voltage Hum Overlay
        const time = performance.now();
        const humOpacity = 0.01 + Math.sin(time * 0.04) * 0.004 + Math.random() * 0.003;
        ctx.fillStyle = `rgba(0, 255, 102, ${humOpacity})`;
        ctx.fillRect(0, 0, 800, 600);
    }
};

window.isTileVoid = function(col, row) {
    return window.GameEngine.isTileVoid(col, row);
};
