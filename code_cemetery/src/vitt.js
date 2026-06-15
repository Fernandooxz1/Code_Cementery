/**
 * Code_Cemetery: Vitt's Journey - Vitt (Player) Module
 * 
 * Manages player state (health/integrity, stamina/CPU), inputs, moves, and subroutines.
 */

window.Vitt = {
    // Positioning and Size
    x: 100,
    y: 100,
    width: 20,
    height: 20,
    
    // Grid Constraints
    TILE_SIZE: 20,
    moveSpeed: 300, // pixels per second (modified by USER)
    minGridX: 0,
    maxGridX: 39,
    minGridY: 3,
    maxGridY: 27,
    gridX: 5,
    gridY: 5,
    targetX: 100,
    targetY: 100,
    
    // Safe Positions for Level 1
    lastSafeGridX: 5,
    lastSafeGridY: 5,
    dodgeActive: false,
    
    // Core Stats
    integrity: 100, // Health (%)
    maxIntegrity: 100,
    cpuCycles: 100, // Stamina
    maxCpuCycles: 100,
    
    // Subroutine/Action States
    isEncrypted: false,  // Cifrado (Invisibility)
    isThrottled: false,  // Thermal Throttling
    isBlocking: false,   // Holding K
    isDodging: false,    // Hex Dodge (i-frames)
    bitflipMode: false,  // Bitflip targeting mode
    
    facingDir: { x: 1, y: 0 },
    
    // Active Visuals
    activeSlash: null,
    activeBlast: null,
    activePrefetchTrail: null,
    bitflipTargetGrid: { x: 0, y: 0 },
    textEffects: [],
    
    // Timers
    parryTimer: 0,
    throttleTimer: 0,
    dodgeTimer: 0,
    rallyTimer: 0,
    slashTimer: 0,
    reticleMoveTimer: 0,
    
    // Mechanics
    rallyableHealth: 0,
    lastKeys: {},

    init() {
        this.integrity = 100;
        this.maxIntegrity = 100;
        this.cpuCycles = 100;
        this.maxCpuCycles = 100;
        
        this.isEncrypted = false;
        this.isThrottled = false;
        this.isBlocking = false;
        this.isDodging = false;
        this.bitflipMode = false;
        
        this.facingDir = { x: 1, y: 0 };
        
        this.gridX = (window.currentLevel === 1) ? 5 : 3;
        this.gridY = (window.currentLevel === 1) ? 5 : 5;
        this.x = this.gridX * this.TILE_SIZE;
        this.y = this.gridY * this.TILE_SIZE;
        this.targetX = this.x;
        this.targetY = this.y;
        
        this.lastSafeGridX = this.gridX;
        this.lastSafeGridY = this.gridY;
        this.dodgeActive = false;
        
        this.parryTimer = 0;
        this.throttleTimer = 0;
        this.dodgeTimer = 0;
        this.rallyTimer = 0;
        this.slashTimer = 0;
        this.reticleMoveTimer = 0;
        
        this.rallyableHealth = 0;
        
        this.activeSlash = null;
        this.activeBlast = null;
        this.activePrefetchTrail = null;
        this.bitflipTargetGrid = { x: 0, y: 0 };
        
        this.textEffects = [];
        this.lastKeys = {};
        
        console.log("Vitt Initialized");
    },
    
    update(dt) {
        // Clamp dt to prevent massive jumps when tab is unfocused
        dt = Math.min(dt, 0.1);
        
        // 1. Update timers
        if (this.parryTimer > 0) {
            this.parryTimer = Math.max(0, this.parryTimer - dt);
        }
        if (this.throttleTimer > 0) {
            this.throttleTimer = Math.max(0, this.throttleTimer - dt);
            if (this.throttleTimer <= 0 && this.isThrottled) {
                this.isThrottled = false;
                if (window.flashAlert) {
                    window.flashAlert("SOBRECALENTAMIENTO DESACTIVADO", "cyan");
                }
            }
        }
        if (this.dodgeTimer > 0) {
            this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
            }
        }
        if (this.rallyTimer > 0) {
            this.rallyTimer = Math.max(0, this.rallyTimer - dt);
        }
        
        // Rally health decay
        if (this.rallyableHealth > 0) {
            if (this.rallyTimer <= 2.0) {
                this.rallyableHealth = Math.max(0, this.rallyableHealth - 12 * dt);
            }
        }
        
        if (this.slashTimer > 0) {
            this.slashTimer = Math.max(0, this.slashTimer - dt);
        }
        if (this.reticleMoveTimer > 0) {
            this.reticleMoveTimer = Math.max(0, this.reticleMoveTimer - dt);
        }
        
        // Update active visual effects
        if (this.activeSlash) {
            this.activeSlash.timer -= dt;
            if (this.activeSlash.timer <= 0) {
                this.activeSlash = null;
            }
        }
        if (this.activeBlast) {
            this.activeBlast.timer -= dt;
            this.activeBlast.radius = this.activeBlast.maxRadius * (1 - (this.activeBlast.timer / this.activeBlast.duration));
            if (this.activeBlast.timer <= 0) {
                this.activeBlast = null;
            }
        }
        if (this.activePrefetchTrail) {
            this.activePrefetchTrail.timer -= dt;
            if (this.activePrefetchTrail.timer <= 0) {
                this.activePrefetchTrail = null;
            }
        }
        
        // Update invulnerability state (Hex Dodge and Cache Prefetch active frames)
        this.dodgeActive = this.isDodging || (this.activePrefetchTrail !== null);
        
        // Update floating text effects
        this.textEffects.forEach(effect => {
            effect.y -= 25 * dt;
            effect.timer -= dt;
        });
        this.textEffects = this.textEffects.filter(effect => effect.timer > 0);
        
        // 2. CPU Stamina Drain and Regeneration
        if (this.isEncrypted) {
            this.cpuCycles = Math.max(0, this.cpuCycles - 20 * dt);
            if (this.cpuCycles <= 0) {
                this.isEncrypted = false;
                this.triggerThermalThrottling();
            }
        } else if (this.isBlocking && this.parryTimer <= 0) {
            this.cpuCycles = Math.max(0, this.cpuCycles - 15 * dt);
            if (this.cpuCycles <= 0) {
                this.isBlocking = false;
                this.triggerThermalThrottling();
            }
        } else {
            // Regeneration
            if (!this.isThrottled) {
                this.cpuCycles = Math.min(this.maxCpuCycles, this.cpuCycles + 25 * dt);
            } else {
                // Recover very slowly during throttling
                this.cpuCycles = Math.min(this.maxCpuCycles, this.cpuCycles + 4 * dt);
            }
        }
        
        // 3. Input Handling
        let keys = window.GameEngine.keys || {};
        let pressed = (key) => keys[key] && !this.lastKeys[key];
        
        // Action keys (cannot execute if throttled or dodging)
        if (!this.isThrottled && !this.isDodging) {
            if (this.bitflipMode) {
                // Inside Bitflip targeting mode, redirect actions
                if (pressed("I") || pressed("J")) {
                    this.useBitflip(); // Confirm flip
                } else if (pressed("K") || pressed("L")) {
                    this.bitflipMode = false; // Cancel flip
                    this.showTextEffect("FLIP CANCELADO", "#888888");
                }
            } else {
                // Normal mode actions
                if (pressed("J")) {
                    this.slash();
                } else if (pressed("L")) {
                    this.dodge();
                } else if (pressed("U")) {
                    this.useCifrado();
                } else if (pressed("I")) {
                    this.useBitflip();
                } else if (pressed("O")) {
                    this.useOverflow();
                } else if (pressed("P")) {
                    this.useCachePrefetch();
                } else if (pressed("R")) {
                    this.refreshCycle();
                }
                
                // Parry / Block (K)
                if (pressed("K")) {
                    this.parry();
                }
                if (this.isBlocking && !keys["K"]) {
                    this.isBlocking = false;
                    this.parryTimer = 0;
                }
            }
        } else if (this.isThrottled) {
            // If throttled, release block if held
            this.isBlocking = false;
            this.parryTimer = 0;
        }
        
        // Movement (either reticle or player)
        let rawMoveX = 0;
        let rawMoveY = 0;
        if (keys["W"] || keys["ARROWUP"]) rawMoveY = -1;
        if (keys["S"] || keys["ARROWDOWN"]) rawMoveY = 1;
        if (keys["A"] || keys["ARROWLEFT"]) rawMoveX = -1;
        if (keys["D"] || keys["ARROWRIGHT"]) rawMoveX = 1;
        
        if (this.bitflipMode) {
            // Reticle movement in targeting mode
            if (rawMoveX !== 0 || rawMoveY !== 0) {
                if (this.reticleMoveTimer <= 0) {
                    this.bitflipTargetGrid.x += rawMoveX;
                    this.bitflipTargetGrid.y += rawMoveY;
                    this.bitflipTargetGrid.x = Math.max(this.minGridX, Math.min(this.maxGridX, this.bitflipTargetGrid.x));
                    this.bitflipTargetGrid.y = Math.max(this.minGridY, Math.min(this.maxGridY, this.bitflipTargetGrid.y));
                    this.reticleMoveTimer = 0.15; // 150ms delay
                }
            }
        } else {
            // Normal player movement
            if (this.x === this.targetX && this.y === this.targetY) {
                // Track safe grid positions
                let isWall = false;
                if (window.isTileSolid && window.isTileSolid(this.gridX, this.gridY)) isWall = true;
                if (window.GameEngine.isSolid && window.GameEngine.isSolid(this.x, this.y)) isWall = true;

                let isHazard = false;
                if (window.isTileHazard && window.isTileHazard(this.gridX, this.gridY)) isHazard = true;
                if (window.isVacuum && window.isVacuum(this.gridX, this.gridY)) isHazard = true;
                if (window.isPit && window.isPit(this.gridX, this.gridY)) isHazard = true;

                let isSafe = !isWall && !isHazard;
                if (window.isTileSafe) {
                    isSafe = window.isTileSafe(this.gridX, this.gridY);
                }

                if (isSafe) {
                    this.lastSafeGridX = this.gridX;
                    this.lastSafeGridY = this.gridY;
                }

                if (rawMoveX !== 0 || rawMoveY !== 0) {
                    // Update facing direction even if we don't move
                    this.facingDir = { x: rawMoveX, y: rawMoveY };
                    
                    let nextGridX = this.gridX + rawMoveX;
                    let nextGridY = this.gridY + rawMoveY;
                    
                    // Boundary check
                    if (nextGridX >= this.minGridX && nextGridX <= this.maxGridX &&
                        nextGridY >= this.minGridY && nextGridY <= this.maxGridY) {
                        
                        // Solid tile check
                        let isSolid = false;
                        if (window.isTileSolid && window.isTileSolid(nextGridX, nextGridY)) isSolid = true;
                        if (window.GameEngine.isSolid && window.GameEngine.isSolid(nextGridX * this.TILE_SIZE, nextGridY * this.TILE_SIZE)) isSolid = true;
                        
                        if (!isSolid) {
                            this.gridX = nextGridX;
                            this.gridY = nextGridY;
                            this.targetX = this.gridX * this.TILE_SIZE;
                            this.targetY = this.gridY * this.TILE_SIZE;
                        }
                    }
                }
            }
            
            // Interpolate position
            if (this.x !== this.targetX || this.y !== this.targetY) {
                let speedMult = 1.0;
                if (this.isThrottled) speedMult *= 0.5;
                if (this.isBlocking) speedMult *= 0.5;
                
                let speed = this.moveSpeed * speedMult;
                let step = speed * dt;
                
                let dx = this.targetX - this.x;
                let dy = this.targetY - this.y;
                
                if (Math.abs(dx) <= step) this.x = this.targetX;
                else this.x += Math.sign(dx) * step;
                
                if (Math.abs(dy) <= step) this.y = this.targetY;
                else this.y += Math.sign(dy) * step;
            }
        }
        
        // Save keyboard state
        this.lastKeys = {};
        for (let key in keys) {
            this.lastKeys[key] = keys[key];
        }
    },
    
    draw(ctx) {
        let cx = this.x + this.width / 2;
        let cy = this.y + this.height / 2;
        
        // 1. Draw Cache Prefetch Trail if active
        if (this.activePrefetchTrail) {
            let trail = this.activePrefetchTrail;
            let progress = 1 - (trail.timer / trail.maxTimer);
            ctx.save();
            ctx.strokeStyle = "rgba(0, 255, 102, " + (0.8 * (1 - progress)) + ")";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(trail.x1, trail.y1);
            ctx.lineTo(trail.x2, trail.y2);
            ctx.stroke();
            
            // Draw fading hex addresses along the path
            ctx.fillStyle = "rgba(0, 242, 254, " + (0.6 * (1 - progress)) + ")";
            ctx.font = "10px 'Courier Prime', monospace";
            let steps = 5;
            for (let i = 0; i <= steps; i++) {
                let t = i / steps;
                let px = trail.x1 + t * (trail.x2 - trail.x1);
                let py = trail.y1 + t * (trail.y2 - trail.y1);
                let addr = "0x" + (Math.floor(t * 0xFFFF)).toString(16).toUpperCase().padStart(4, '0');
                ctx.fillText(addr, px, py - 5);
            }
            ctx.restore();
        }
        
        // 2. Draw Active Slash if active
        if (this.activeSlash) {
            let slash = this.activeSlash;
            let progress = 1 - (slash.timer / slash.duration);
            ctx.save();
            ctx.fillStyle = "rgba(0, 242, 254, " + (1 - progress) + ")";
            ctx.font = "italic 14px 'Courier Prime', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            let sweepDist = 20 + progress * 25;
            let tx = cx + slash.dirX * sweepDist;
            let ty = cy + slash.dirY * sweepDist;
            
            ctx.translate(tx, ty);
            let angle = Math.atan2(slash.dirY, slash.dirX);
            ctx.rotate(angle);
            ctx.fillText(slash.text, 0, 0);
            ctx.restore();
        }
        
        // 3. Draw Overflow Blast if active
        if (this.activeBlast) {
            let blast = this.activeBlast;
            let progress = 1 - (blast.timer / blast.duration);
            ctx.save();
            ctx.strokeStyle = "rgba(255, 0, 85, " + (0.6 * (1 - progress)) + ")";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(blast.x, blast.y, blast.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = "rgba(255, 0, 85, " + (0.8 * (1 - progress)) + ")";
            ctx.font = "bold 12px 'Courier Prime', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            let charCount = 12;
            for (let i = 0; i < charCount; i++) {
                let angle = (i / charCount) * Math.PI * 2 + progress * 2;
                let px = blast.x + Math.cos(angle) * blast.radius;
                let py = blast.y + Math.sin(angle) * blast.radius;
                let hexList = ["0xDE", "0xAD", "0xBE", "0xEF", "0x41", "0x55", "0xAA", "0xFF"];
                let hex = hexList[i % hexList.length];
                ctx.fillText(hex, px, py);
            }
            ctx.restore();
        }
        
        // 4. Draw Bitflip target reticle if active
        if (this.bitflipMode) {
            let rx = this.bitflipTargetGrid.x * this.TILE_SIZE;
            let ry = this.bitflipTargetGrid.y * this.TILE_SIZE;
            ctx.save();
            let blink = Math.floor(Date.now() / 150) % 2 === 0;
            ctx.strokeStyle = blink ? "#00f2fe" : "rgba(0, 242, 254, 0.3)";
            ctx.lineWidth = 2;
            ctx.strokeRect(rx, ry, this.TILE_SIZE, this.TILE_SIZE);
            
            ctx.fillStyle = "#00f2fe";
            ctx.font = "10px 'Courier Prime', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("FLIP", rx + this.TILE_SIZE/2, ry - 10);
            ctx.restore();
        }
        
        // 5. Draw Block Shield if active
        if (this.isBlocking) {
            ctx.save();
            ctx.strokeStyle = "rgba(0, 242, 254, 0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 18, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 18, Math.PI - Math.PI/3, Math.PI + Math.PI/3);
            ctx.stroke();
            ctx.restore();
        }
        
        // 6. Draw Vitt Character '&' or '?'
        ctx.save();
        let breathY = Math.sin(Date.now() / 200) * 2;
        ctx.translate(0, breathY);
        
        if (!this.isEncrypted) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.isThrottled ? "#ff0055" : "#00ff66";
        }
        
        ctx.fillStyle = this.isThrottled ? (Math.floor(Date.now() / 150) % 2 === 0 ? "#ff0055" : "#660022") :
                        this.isEncrypted ? "rgba(0, 242, 254, 0.4)" :
                        this.isBlocking ? "#00f2fe" : "#00ff66";
        
        ctx.font = "bold 24px 'Courier Prime', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let symbol = this.isEncrypted ? "?" : "&";
        ctx.fillText(symbol, cx, cy);
        
        // Blinking '!' if throttled
        if (this.isThrottled) {
            let flash = Math.floor(Date.now() / 200) % 2 === 0;
            if (flash) {
                ctx.fillStyle = "#ff0055";
                ctx.font = "bold 16px 'Courier Prime', monospace";
                ctx.fillText("!", cx, -12);
            }
        }
        ctx.restore();
        
        // 7. Draw floating text effects
        this.textEffects.forEach(effect => {
            let alpha = effect.timer / effect.maxTimer;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = effect.color;
            ctx.font = "bold 12px 'Courier Prime', monospace";
            ctx.textAlign = "center";
            ctx.fillText(effect.text, effect.x, effect.y);
            ctx.restore();
        });
        
        // 8. Draw HUD Overlay
        this.drawHUD(ctx);
    },
    
    drawHUD(ctx) {
        ctx.save();
        // Clear shadow for HUD text to avoid blur/slowdowns
        ctx.shadowBlur = 0;
        
        // Top HUD bar
        ctx.fillStyle = "rgba(5, 7, 10, 0.85)";
        ctx.fillRect(0, 0, 800, 45);
        ctx.strokeStyle = "rgba(0, 255, 102, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 45);
        ctx.lineTo(800, 45);
        ctx.stroke();
        
        ctx.font = "bold 12px 'Courier Prime', monospace";
        ctx.textBaseline = "top";
        
        // Integrity Bar
        let hpChars = 10;
        let hpFilled = Math.round((this.integrity / this.maxIntegrity) * hpChars);
        let hpRally = Math.round((this.rallyableHealth / this.maxIntegrity) * hpChars);
        let hpBar = "[";
        for (let i = 0; i < hpChars; i++) {
            if (i < hpFilled) hpBar += "■";
            else if (i < hpFilled + hpRally) hpBar += "▒";
            else hpBar += " ";
        }
        hpBar += "]";
        
        ctx.fillStyle = this.integrity < 30 ? "#ff0055" : "#00ff66";
        ctx.fillText(`INTEGRITY: ${hpBar} ${Math.round(this.integrity)}%`, 20, 15);
        
        // CPU Frequency / Cycles Bar
        let cpuChars = 10;
        let cpuFilled = Math.round((this.cpuCycles / this.maxCpuCycles) * cpuChars);
        let cpuBar = "[";
        for (let i = 0; i < cpuChars; i++) {
            if (i < cpuFilled) cpuBar += "■";
            else cpuBar += " ";
        }
        cpuBar += "]";
        
        ctx.fillStyle = this.isThrottled ? "#ff0055" : "#00f2fe";
        let cpuText = this.isThrottled ? "LIMITADO" : `${Math.round(this.cpuCycles)} MHz`;
        ctx.fillText(`CPU FREQ: ${cpuBar} ${cpuText}`, 260, 15);
        
        // Status Alerts
        ctx.textAlign = "right";
        if (this.isThrottled) {
            let blink = Math.floor(Date.now() / 200) % 2 === 0;
            ctx.fillStyle = blink ? "#ff0055" : "rgba(255, 0, 85, 0.3)";
            ctx.fillText("⚠ SOBRECALENTAMIENTO DE CPU ⚠", 780, 15);
        } else if (this.isEncrypted) {
            ctx.fillStyle = "#00f2fe";
            ctx.fillText("🔒 ENCRIPTACIÓN CIFRADO ACTIVA", 780, 15);
        } else {
            ctx.fillStyle = "rgba(0, 255, 102, 0.6)";
            ctx.fillText("ESTADO: SISTEMA NOMINAL (0x00)", 780, 15);
        }
        
        // Bottom Subroutines Panel
        ctx.fillStyle = "rgba(5, 7, 10, 0.85)";
        ctx.fillRect(0, 565, 800, 35);
        ctx.strokeStyle = "rgba(0, 255, 102, 0.2)";
        ctx.beginPath();
        ctx.moveTo(0, 565);
        ctx.lineTo(800, 565);
        ctx.stroke();
        
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillText("SUBRUTINAS:", 20, 577);
        
        // U: Cifrado
        ctx.fillStyle = this.isThrottled ? "#666" : (this.isEncrypted ? "#00f2fe" : (this.cpuCycles >= 15 ? "#00ff66" : "#aa0000"));
        ctx.fillText("[U] CIFRADO", 140, 577);
        
        // I: Bitflip
        ctx.fillStyle = this.isThrottled ? "#666" : (this.bitflipMode ? "#00f2fe" : (this.cpuCycles >= 20 ? "#00ff66" : "#aa0000"));
        ctx.fillText("[I] BITFLIP", 280, 577);
        
        // O: Overflow
        ctx.fillStyle = this.isThrottled ? "#666" : (this.cpuCycles >= 25 ? "#00ff66" : "#aa0000");
        ctx.fillText("[O] OVERFLOW", 420, 577);
        
        // P: Cache Prefetch
        ctx.fillStyle = this.isThrottled ? "#666" : (this.cpuCycles >= 30 ? "#00ff66" : "#aa0000");
        ctx.fillText("[P] PREFETCH", 560, 577);
        
        ctx.restore();
    },
    
    // Core Actions & Abilities
    slash() {
        if (this.isThrottled || this.slashTimer > 0) return;
        if (this.cpuCycles < 15) {
            this.showTextEffect("* SIN ANCHO DE BANDA *", "#ff0055");
            return;
        }
        
        this.cpuCycles = Math.max(0, this.cpuCycles - 15);
        if (this.cpuCycles === 0) this.triggerThermalThrottling();
        
        this.slashTimer = 0.35; // 350ms cooldown
        
        if (window.GameAudio.playSlash) window.GameAudio.playSlash();
        
        const SNIPPETS = ["malloc()", "free()", "memcpy()", "memset()", "realloc()", "printf()", "sizeof()", "calloc()", "strlen()", "strcpy()"];
        let text = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
        
        let cx = this.x + this.width / 2;
        let cy = this.y + this.height / 2;
        let fx = this.facingDir.x;
        let fy = this.facingDir.y;
        
        let sw = fx !== 0 ? 60 : 40;
        let sh = fy !== 0 ? 60 : 40;
        let scx = cx + fx * 30;
        let scy = cy + fy * 30;
        
        let slashBox = {
            x: scx - sw / 2,
            y: scy - sh / 2,
            width: sw,
            height: sh
        };
        
        this.activeSlash = {
            x: slashBox.x,
            y: slashBox.y,
            width: sw,
            height: sh,
            dirX: fx,
            dirY: fy,
            text: text,
            duration: 0.2,
            timer: 0.2
        };
        
        let hitEnemy = false;
        if (window.activeEnemies) {
            window.activeEnemies.forEach(enemy => {
                if (enemy.isNPC) return;
                let ew = enemy.width || 20;
                let eh = enemy.height || 20;
                let enemyBox = { x: enemy.x, y: enemy.y, width: ew, height: eh };
                
                if (slashBox.x < enemyBox.x + enemyBox.width &&
                    slashBox.x + slashBox.width > enemyBox.x &&
                    slashBox.y < enemyBox.y + enemyBox.height &&
                    slashBox.y + slashBox.height > enemyBox.y) {
                    
                    enemy.integrity = (enemy.integrity || 0) - 20;
                    enemy.staggered = true;
                    enemy.staggerTimer = 0.5;
                    enemy.x = Math.max(0, Math.min(800 - ew, enemy.x + fx * 15));
                    enemy.y = Math.max(60, Math.min(540 - eh, enemy.y + fy * 15));
                    
                    hitEnemy = true;
                    
                    // Rally health recovery
                    if (this.rallyableHealth > 0) {
                        let recover = Math.min(this.rallyableHealth, 8);
                        this.integrity = Math.min(this.maxIntegrity, this.integrity + recover);
                        this.rallyableHealth -= recover;
                    }
                    
                    if (window.GameEngine.spawnParticles) {
                        window.GameEngine.spawnParticles(enemy.x + ew/2, enemy.y + eh/2, "#00ff66", 8);
                    }
                }
            });
        }
        
        if (hitEnemy) {
            if (window.GameEngine.hitStop) window.GameEngine.hitStop(80);
            if (window.GameEngine.shake) window.GameEngine.shake(5);
            if (window.GameAudio.playHit) window.GameAudio.playHit();
        }
    },
    
    dodge() {
        if (this.isThrottled || this.isDodging) return;
        if (this.cpuCycles < 25) {
            this.showTextEffect("* SIN ANCHO DE BANDA *", "#ff0055");
            return;
        }
        
        this.cpuCycles = Math.max(0, this.cpuCycles - 25);
        if (this.cpuCycles === 0) this.triggerThermalThrottling();
        
        this.isDodging = true;
        this.dodgeTimer = 0.25; // 250ms of i-frames
        
        let startX = this.gridX;
        let startY = this.gridY;
        let dx = this.facingDir.x;
        let dy = this.facingDir.y;
        let finalGridX = startX;
        let finalGridY = startY;
        
        for (let i = 1; i <= 3; i++) {
            let testX = startX + dx * i;
            let testY = startY + dy * i;
            
            if (testX < this.minGridX || testX > this.maxGridX || testY < this.minGridY || testY > this.maxGridY) {
                break;
            }
            
            let solid = false;
            if (window.isTileSolid && window.isTileSolid(testX, testY)) solid = true;
            if (window.GameEngine.isSolid && window.GameEngine.isSolid(testX * this.TILE_SIZE, testY * this.TILE_SIZE)) solid = true;
            
            if (solid) {
                break;
            }
            finalGridX = testX;
            finalGridY = testY;
        }
        
        this.gridX = finalGridX;
        this.gridY = finalGridY;
        this.x = this.gridX * this.TILE_SIZE;
        this.y = this.gridY * this.TILE_SIZE;
        this.targetX = this.x;
        this.targetY = this.y;
        
        if (window.GameAudio.playDash) window.GameAudio.playDash();
        if (window.GameEngine.spawnParticles) {
            window.GameEngine.spawnParticles(this.x + this.width/2, this.y + this.height/2, "#00f2fe", 6);
        }
        this.showTextEffect("ESQUIVA HEX", "#00f2fe");
    },
    
    parry() {
        if (this.isThrottled) return;
        this.parryTimer = 12 / 60; // 12 frames parry window
        this.isBlocking = true;
        this.showTextEffect("* BLOQUEADO *", "#00f2fe");
        if (window.GameAudio.playDash) window.GameAudio.playDash(); // clean block sound
    },
    
    // Subroutines
    useCifrado() {
        if (this.isThrottled) return;
        if (this.isEncrypted) {
            this.isEncrypted = false;
            this.showTextEffect("DESCIFRADO", "#00ff66");
            if (window.GameAudio.playDash) window.GameAudio.playDash();
        } else {
            if (this.cpuCycles < 15) {
                this.showTextEffect("* SIN ANCHO DE BANDA *", "#ff0055");
                return;
            }
            this.isEncrypted = true;
            this.showTextEffect("CIFRADO ACTIVO", "#00f2fe");
            if (window.GameAudio.playDash) window.GameAudio.playDash();
        }
    },
    
    useBitflip() {
        if (this.isThrottled) return;
        if (this.bitflipMode) {
            if (this.cpuCycles < 20) {
                this.showTextEffect("* SIN ANCHO DE BANDA *", "#ff0055");
                this.bitflipMode = false;
                return;
            }
            
            this.cpuCycles = Math.max(0, this.cpuCycles - 20);
            if (this.cpuCycles === 0) this.triggerThermalThrottling();
            
            let tx = this.bitflipTargetGrid.x;
            let ty = this.bitflipTargetGrid.y;
            let flippedSomething = false;
            
            // 1. Flip enemies (stuns them)
            if (window.activeEnemies) {
                window.activeEnemies.forEach(enemy => {
                    let ex = Math.round(enemy.x / this.TILE_SIZE);
                    let ey = Math.round(enemy.y / this.TILE_SIZE);
                    if (ex === tx && ey === ty) {
                        enemy.isStunned = true;
                        enemy.stunTimer = 3.0;
                        enemy.staggered = true;
                        enemy.staggerTimer = 3.0;
                        if (enemy.symbol) {
                            enemy.symbol = enemy.symbol.toLowerCase();
                        }
                        flippedSomething = true;
                        this.showTextEffect("* ATURDIDO *", "#00f2fe");
                        if (window.GameEngine.spawnParticles) {
                            window.GameEngine.spawnParticles(enemy.x + 10, enemy.y + 10, "#00f2fe", 12);
                        }
                    }
                });
            }
            
            // 2. Flip projectiles (flips to green healing node)
            let projectilesList = window.activeProjectiles || window.GameEngine.projectiles || [];
            let remainingProjectiles = [];
            projectilesList.forEach(p => {
                let px = Math.round(p.x / this.TILE_SIZE);
                let py = Math.round(p.y / this.TILE_SIZE);
                if (px === tx && py === ty) {
                    this.integrity = Math.min(this.maxIntegrity, this.integrity + 15);
                    flippedSomething = true;
                    this.showTextEffect("+15% INTEGRITY", "#00ff66");
                    if (window.GameAudio.playLevelUp) window.GameAudio.playLevelUp();
                    if (window.GameEngine.spawnParticles) {
                        window.GameEngine.spawnParticles(p.x + 10, p.y + 10, "#00ff66", 10);
                    }
                } else {
                    remainingProjectiles.push(p);
                }
            });
            if (window.activeProjectiles) window.activeProjectiles = remainingProjectiles;
            if (window.GameEngine.projectiles) window.GameEngine.projectiles = remainingProjectiles;
            
            // 3. Flip traps/lasers (deactivates them)
            let trapsList = window.activeTraps || window.activeHazards || window.GameEngine.traps || window.GameEngine.hazards || [];
            trapsList.forEach(t => {
                let tx_grid = Math.round(t.x / this.TILE_SIZE);
                let ty_grid = Math.round(t.y / this.TILE_SIZE);
                if (tx_grid === tx && ty_grid === ty) {
                    t.active = false;
                    t.disabled = true;
                    t.flipped = true;
                    flippedSomething = true;
                    this.showTextEffect("TRAP DEACTIVATED", "#00ff66");
                    if (window.GameEngine.spawnParticles) {
                        window.GameEngine.spawnParticles(t.x + 10, t.y + 10, "#00ff66", 8);
                    }
                }
            });
            
            if (!flippedSomething) {
                this.showTextEffect("FLIP VACÍO", "#888888");
            } else {
                if (window.GameAudio.playParry) window.GameAudio.playParry();
            }
            
            this.bitflipMode = false;
        } else {
            this.bitflipMode = true;
            this.bitflipTargetGrid = {
                x: Math.max(this.minGridX, Math.min(this.maxGridX, this.gridX + this.facingDir.x * 2)),
                y: Math.max(this.minGridY, Math.min(this.maxGridY, this.gridY + this.facingDir.y * 2))
            };
            this.reticleMoveTimer = 0;
            this.showTextEffect("APUNTANDO BITFLIP", "#00f2fe");
        }
    },
    
    useOverflow() {
        if (this.isThrottled) return;
        if (this.cpuCycles < 25) {
            this.showTextEffect("* SIN ANCHO DE BANDA *", "#ff0055");
            return;
        }
        
        this.cpuCycles = 0;
        this.triggerThermalThrottling();
        
        let cx = this.x + this.width / 2;
        let cy = this.y + this.height / 2;
        
        this.activeBlast = {
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: 160,
            speed: 450,
            duration: 0.35,
            timer: 0.35
        };
        
        if (window.activeEnemies) {
            window.activeEnemies.forEach(enemy => {
                let ew = enemy.width || 20;
                let eh = enemy.height || 20;
                let ecx = enemy.x + ew/2;
                let ecy = enemy.y + eh/2;
                let dx = ecx - cx;
                let dy = ecy - cy;
                let dist = Math.sqrt(dx*dx + dy*dy) || 1;
                
                if (dist <= 160) {
                    enemy.integrity = (enemy.integrity || 0) - 35;
                    enemy.staggered = true;
                    enemy.staggerTimer = 2.0;
                    enemy.stunTimer = 2.0;
                    
                    let pushX = (dx / dist) * 50;
                    let pushY = (dy / dist) * 50;
                    enemy.x = Math.max(0, Math.min(800 - ew, enemy.x + pushX));
                    enemy.y = Math.max(60, Math.min(540 - eh, enemy.y + pushY));
                    
                    if (window.GameEngine.spawnParticles) {
                        window.GameEngine.spawnParticles(enemy.x + ew/2, enemy.y + eh/2, "#ff0055", 8);
                    }
                }
            });
        }
        
        let projectilesList = window.activeProjectiles || window.GameEngine.projectiles || [];
        let remainingProjectiles = [];
        projectilesList.forEach(p => {
            let px = p.x + 10;
            let py = p.y + 10;
            let dx = px - cx;
            let dy = py - cy;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist <= 160) {
                if (window.GameEngine.spawnParticles) {
                    window.GameEngine.spawnParticles(p.x + 10, p.y + 10, "#ff0055", 6);
                }
            } else {
                remainingProjectiles.push(p);
            }
        });
        if (window.activeProjectiles) window.activeProjectiles = remainingProjectiles;
        if (window.GameEngine.projectiles) window.GameEngine.projectiles = remainingProjectiles;
        
        if (window.GameEngine.shake) window.GameEngine.shake(15);
        if (window.GameAudio.playExplosion) window.GameAudio.playExplosion();
        if (window.GameEngine.spawnParticles) {
            window.GameEngine.spawnParticles(cx, cy, "#ff0055", 25);
        }
        this.showTextEffect("DESBORDAMIENTO", "#ff0055");
    },
    
    useCachePrefetch() {
        if (this.isThrottled) return;
        if (this.cpuCycles < 30) {
            this.showTextEffect("* SIN ANCHO DE BANDA *", "#ff0055");
            return;
        }
        
        this.cpuCycles = Math.max(0, this.cpuCycles - 30);
        if (this.cpuCycles === 0) this.triggerThermalThrottling();
        
        let startGridX = this.gridX;
        let startGridY = this.gridY;
        let dx = this.facingDir.x;
        let dy = this.facingDir.y;
        let finalGridX = startGridX;
        let finalGridY = startGridY;
        
        for (let i = 1; i <= 6; i++) {
            let testX = startGridX + dx * i;
            let testY = startGridY + dy * i;
            
            if (testX < this.minGridX || testX > this.maxGridX || testY < this.minGridY || testY > this.maxGridY) {
                break;
            }
            
            let solid = false;
            if (window.isTileSolid && window.isTileSolid(testX, testY)) solid = true;
            if (window.GameEngine.isSolid && window.GameEngine.isSolid(testX * this.TILE_SIZE, testY * this.TILE_SIZE)) solid = true;
            
            if (solid) {
                break;
            }
            finalGridX = testX;
            finalGridY = testY;
        }
        
        this.gridX = finalGridX;
        this.gridY = finalGridY;
        this.x = this.gridX * this.TILE_SIZE;
        this.y = this.gridY * this.TILE_SIZE;
        this.targetX = this.x;
        this.targetY = this.y;
        
        let x1 = (startGridX + 0.5) * this.TILE_SIZE;
        let y1 = (startGridY + 0.5) * this.TILE_SIZE;
        let x2 = (finalGridX + 0.5) * this.TILE_SIZE;
        let y2 = (finalGridY + 0.5) * this.TILE_SIZE;
        
        this.activePrefetchTrail = {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            timer: 0.35,
            maxTimer: 0.35
        };
        
        function getDistanceToSegment(px, py, x1, y1, x2, y2) {
            let l2 = (x2 - x1)**2 + (y2 - y1)**2;
            if (l2 === 0) return Math.sqrt((px - x1)**2 + (py - y1)**2);
            let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            let projX = x1 + t * (x2 - x1);
            let projY = y1 + t * (y2 - y1);
            return Math.sqrt((px - projX)**2 + (py - projY)**2);
        }
        
        let hitEnemy = false;
        if (window.activeEnemies) {
            window.activeEnemies.forEach(enemy => {
                if (enemy.isNPC) return;
                let ew = enemy.width || 20;
                let eh = enemy.height || 20;
                let ecx = enemy.x + ew/2;
                let ecy = enemy.y + eh/2;
                let dist = getDistanceToSegment(ecx, ecy, x1, y1, x2, y2);
                if (dist <= 25) {
                    enemy.integrity = (enemy.integrity || 0) - 25;
                    enemy.staggered = true;
                    enemy.staggerTimer = 1.0;
                    
                    hitEnemy = true;
                    
                    if (this.rallyableHealth > 0) {
                        let recover = Math.min(this.rallyableHealth, 6);
                        this.integrity = Math.min(this.maxIntegrity, this.integrity + recover);
                        this.rallyableHealth -= recover;
                    }
                    
                    if (window.GameEngine.spawnParticles) {
                        window.GameEngine.spawnParticles(enemy.x + ew/2, enemy.y + eh/2, "#00ff66", 8);
                    }
                }
            });
        }
        
        if (hitEnemy) {
            if (window.GameEngine.hitStop) window.GameEngine.hitStop(80);
            if (window.GameEngine.shake) window.GameEngine.shake(8);
            if (window.GameAudio.playHit) window.GameAudio.playHit();
        }
        
        if (window.GameAudio.playDash) window.GameAudio.playDash();
        this.showTextEffect("PREFETCH DE CACHÉ", "#00ff66");
    },
    
    refreshCycle() {
        if (this.isThrottled) return;
        if (this.cpuCycles < 25) {
            this.showTextEffect("* SIN ANCHO DE BANDA *", "#ff0055");
            return;
        }
        
        this.cpuCycles = Math.max(0, this.cpuCycles - 25);
        if (this.cpuCycles === 0) this.triggerThermalThrottling();
        
        if (window.Bit0) {
            let dx = (this.x + this.width/2) - (window.Bit0.x + (window.Bit0.width || 20)/2);
            let dy = (this.y + this.height/2) - (window.Bit0.y + (window.Bit0.height || 20)/2);
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist <= 150) {
                window.Bit0.voltage = Math.min(100, (window.Bit0.voltage || 0) + 30);
                this.showTextEffect("* VOLTAJE +30 *", "#00ff66");
                if (window.GameAudio.playLevelUp) window.GameAudio.playLevelUp();
                if (window.GameEngine.spawnParticles) {
                    window.GameEngine.spawnParticles(window.Bit0.x + 10, window.Bit0.y + 10, "#00ff66", 15);
                }
                return;
            }
        }
        this.showTextEffect("* SIN CONEXIÓN *", "#888888");
    },
    
    resetToSafePosition() {
        this.gridX = this.lastSafeGridX;
        this.gridY = this.lastSafeGridY;
        this.x = this.gridX * this.TILE_SIZE;
        this.y = this.gridY * this.TILE_SIZE;
        this.targetX = this.x;
        this.targetY = this.y;
        this.showTextEffect("RESPAWN", "#00f2fe");
    },
    
    // Auxiliary Damage / Interaction Interface
    takeDamage(amount, enemy) {
        if (this.isDodging || this.dodgeActive) return; // Invulnerable during dodge/prefetch
        
        // 1. Perfect Parry window
        if (this.parryTimer > 0) {
            this.parryTimer = 0;
            this.cpuCycles = Math.min(this.maxCpuCycles, this.cpuCycles + 30);
            
            if (enemy) {
                enemy.staggered = true;
                enemy.staggerTimer = 2.5;
                enemy.stunTimer = 2.5;
                let ew = enemy.width || 20;
                let eh = enemy.height || 20;
                let dx = enemy.x - this.x;
                let dy = enemy.y - this.y;
                let len = Math.sqrt(dx*dx + dy*dy) || 1;
                enemy.x = Math.max(0, Math.min(800 - ew, enemy.x + (dx / len) * 40));
                enemy.y = Math.max(60, Math.min(540 - eh, enemy.y + (dy / len) * 40));
            }
            
            if (window.GameAudio.playParry) window.GameAudio.playParry();
            if (window.GameEngine.shake) window.GameEngine.shake(10);
            if (window.GameEngine.spawnParticles) {
                window.GameEngine.spawnParticles(this.x + this.width/2, this.y + this.height/2, '#00f2fe', 15);
            }
            
            this.showTextEffect("* DESVÍO PERFECTO *", "#00f2fe");
            return;
        }
        
        // 2. Blocking state
        if (this.isBlocking) {
            let blockReduction = 0.75; // 75% reduction
            let blockedDamage = amount * blockReduction;
            let finalDamage = amount - blockedDamage;
            
            this.cpuCycles = Math.max(0, this.cpuCycles - blockedDamage);
            
            this.integrity = Math.max(0, this.integrity - finalDamage);
            this.rallyableHealth = Math.min(this.maxIntegrity - this.integrity, this.rallyableHealth + finalDamage);
            this.rallyTimer = 3.0;
            
            if (window.GameAudio.playHit) window.GameAudio.playHit();
            if (window.GameEngine.shake) window.GameEngine.shake(3);
            
            if (this.cpuCycles <= 0) {
                this.isBlocking = false;
                this.triggerThermalThrottling();
                this.showTextEffect("BLOQUEO ROTO", "#ff0055");
            } else {
                this.showTextEffect("* BLOQUEADO *", "#00ff66");
            }
            
            if (this.integrity <= 0 && window.triggerGameOver) {
                window.triggerGameOver();
            }
            return;
        }
        
        // 3. Normal hit
        this.integrity = Math.max(0, this.integrity - amount);
        this.rallyableHealth = Math.min(this.maxIntegrity - this.integrity, this.rallyableHealth + amount);
        this.rallyTimer = 3.0;
        
        if (window.GameAudio.playHit) window.GameAudio.playHit();
        if (window.GameEngine.shake) window.GameEngine.shake(8);
        
        if (window.GameEngine.spawnParticles) {
            window.GameEngine.spawnParticles(this.x + this.width/2, this.y + this.height/2, '#ff0055', 10);
        }
        
        this.showTextEffect("-" + Math.round(amount) + "%", "#ff0055");
        
        if (this.integrity <= 0 && window.triggerGameOver) {
            window.triggerGameOver();
        }
    },
    
    triggerThermalThrottling() {
        if (this.isThrottled) return;
        this.isThrottled = true;
        this.throttleTimer = 2.5;
        this.cpuCycles = 0;
        this.isEncrypted = false;
        this.isBlocking = false;
        this.bitflipMode = false;
        
        if (window.GameAudio.playAlarm) window.GameAudio.playAlarm(1);
        if (window.flashAlert) window.flashAlert("SISTEMA LIMITADO: ¡SOBRECALENTAMIENTO DE CPU!", "red");
        this.showTextEffect("* SOBRECALENTADO *", "#ff0055");
    },
    
    showTextEffect(text, color) {
        this.textEffects.push({
            x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
            y: this.y - 10,
            text: text,
            color: color || "#ffffff",
            timer: 1.0,
            maxTimer: 1.0
        });
    }
};
