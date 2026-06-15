/**
 * Code_Cemetery: Vitt's Journey - Enemies Module
 * 
 * Manages enemies, NPCs, and bosses (Daemon Threads, Memory Leaks, Null Pointers, OOM Killer, PT_Oracle, Bit-0, Byte-0xAA, Spindle Golem).
 */

(function() {
    // Local module-level variables for custom visual effects and minigames
    let floatingTexts = [];
    window.activeProjectiles = window.activeProjectiles || [];
    window.activeSlashes = window.activeSlashes || [];
    window.activeEnemies = window.activeEnemies || [];
    window.activeCollectibles = window.activeCollectibles || [];

    // Dialogue State
    let currentDialogue = null;
    
    // Oscilloscope Minigame State
    let oscilloscopeActive = false;
    let sweepLineX = 220;
    let sweepDirection = 1;
    let targetZoneX = 350;
    let targetZoneW = 50;
    let sweepSpeed = 4.5;
    let enterKeyPressed = false;

    // --- UTILITIES & HELPERS ---
    
    // Word wrapping utility for CLI dialogues
    function wrapText(text, maxLength) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            if ((currentLine + word).length > maxLength) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        });
        if (currentLine) {
            lines.push(currentLine.trim());
        }
        return lines;
    }

    // Spawn a damage or status text popup (All in Spanish)
    function spawnText(x, y, text, color, duration = 45) {
        floatingTexts.push({
            x, y, text, color,
            duration,
            maxDuration: duration
        });
    }

    // Update floating texts position and lifetime
    function updateFloatingTexts() {
        floatingTexts.forEach(ft => {
            ft.y -= 0.6; // float upward
            ft.duration -= 1;
        });
        floatingTexts = floatingTexts.filter(ft => ft.duration > 0);
    }

    // Draw floating texts
    function drawFloatingTexts(ctx) {
        floatingTexts.forEach(ft => {
            ctx.save();
            ctx.font = "bold 13px 'Courier Prime', monospace";
            ctx.fillStyle = ft.color;
            ctx.textAlign = 'center';
            ctx.globalAlpha = ft.duration / ft.maxDuration;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
    }

    // Check if player is currently invulnerable (dodge/encrypt/iframes/godMode)
    function isVittInvulnerable() {
        const target = window.Vitt;
        if (!target) return true;
        return (
            target.godMode === true ||
            target.dodgeActive === true ||
            (target.iframeTimer && target.iframeTimer > 0) ||
            target.isEncrypted === true
        );
    }

    // Box collision check with player
    function hitsPlayer(hitbox) {
        const target = window.Vitt;
        if (!target) return false;
        
        const currentHealth = target.integrity !== undefined ? target.integrity : target.health;
        if (currentHealth <= 0) return false;
        if (isVittInvulnerable()) return false;
        
        const px = target.x;
        const py = target.y;
        const pw = target.width || 20;
        const ph = target.height || 20;
        
        if (hitbox.type === 'circle') {
            const closestX = Math.max(px - pw/2, Math.min(hitbox.x, px + pw/2));
            const closestY = Math.max(py - ph/2, Math.min(hitbox.y, py + ph/2));
            const dx = hitbox.x - closestX;
            const dy = hitbox.y - closestY;
            return (dx*dx + dy*dy) < (hitbox.radius * hitbox.radius);
        } else {
            const hx = hitbox.x;
            const hy = hitbox.y;
            const hw = hitbox.width;
            const hh = hitbox.height;
            return (
                px - pw/2 < hx + hw/2 &&
                px + pw/2 > hx - hw/2 &&
                py - ph/2 < hy + hh/2 &&
                py + ph/2 > hy - hh/2
            );
        }
    }

    // Apply damage to player, handling parries, blocks, and death
    function damagePlayer(amount, canBeParried = true, attackSource = null) {
        const target = window.Vitt;
        if (!target) return;
        
        const currentHealth = target.integrity !== undefined ? target.integrity : target.health;
        if (currentHealth <= 0) return;
        if (isVittInvulnerable()) return;
        
        // Handle parry
        if (canBeParried && (target.parryActive || target.parryTimer > 0 || target.isParrying)) {
            if (window.GameAudio && typeof window.GameAudio.playParry === 'function') {
                window.GameAudio.playParry();
            }
            
            // Stun the attacker (stagger for Golem, normal stun for others)
            if (attackSource) {
                attackSource.stunTimer = 120; // 2 seconds stun
                attackSource.state = attackSource.type === 'boss' ? 'staggered' : 'stunned';
            }
            
            // Restore player CPU/stamina
            if (target.cpuCycles !== undefined) {
                target.cpuCycles = Math.min(target.maxCpuCycles || 100, target.cpuCycles + 30);
            }
            if (target.stamina !== undefined) {
                target.stamina = Math.min(target.maxStamina || 100, target.stamina + 30);
            }
            
            // Effects
            if (window.GameEngine) {
                if (typeof window.GameEngine.shake === 'function') window.GameEngine.shake(8);
                if (typeof window.GameEngine.spawnParticles === 'function') {
                    window.GameEngine.spawnParticles(target.x, target.y, '#00f2fe', 15);
                }
            }
            
            spawnText(target.x, target.y - 35, "* PARRADO *", "#00f2fe", 45);
            return;
        }
        
        // Handle block
        if (target.blockActive || target.isBlocking) {
            const blockCost = amount * 0.4;
            const cycles = target.cpuCycles !== undefined ? target.cpuCycles : target.stamina;
            if (cycles !== undefined && cycles >= blockCost) {
                if (target.cpuCycles !== undefined) target.cpuCycles -= blockCost;
                else if (target.stamina !== undefined) target.stamina -= blockCost;
                
                amount *= 0.2; // 80% damage reduction
                
                if (window.GameAudio && typeof window.GameAudio.playHit === 'function') {
                    window.GameAudio.playHit();
                }
                if (window.GameEngine && typeof window.GameEngine.shake === 'function') {
                    window.GameEngine.shake(3);
                }
                spawnText(target.x, target.y - 35, "* BLOQUEADO *", "#cbd5e0", 45);
            }
        }
        
        // Apply damage
        if (target.integrity !== undefined) {
            target.integrity -= amount;
            if (target.integrity < 0) target.integrity = 0;
        }
        if (target.health !== undefined) {
            target.health -= amount;
            if (target.health < 0) target.health = 0;
        }
        
        // Effects
        if (window.GameAudio && typeof window.GameAudio.playHit === 'function') {
            window.GameAudio.playHit();
        }
        if (window.GameEngine) {
            if (typeof window.GameEngine.shake === 'function') window.GameEngine.shake(10);
            if (typeof window.GameEngine.spawnParticles === 'function') {
                window.GameEngine.spawnParticles(target.x, target.y, '#ff0055', 12);
            }
        }
        
        spawnText(target.x, target.y - 20, `-${Math.round(amount)} INTEGRIDAD`, '#ff0055', 50);
        
        // Check death
        const checkHealth = target.integrity !== undefined ? target.integrity : target.health;
        if (checkHealth <= 0) {
            if (typeof window.triggerGameOver === 'function') {
                window.triggerGameOver();
            }
        }
    }

    // Apply damage to enemies
    function takeDamage(enemy, damage) {
        if (enemy.hitCooldown > 0) return;
        
        let finalDamage = damage;
        // Stagger / Stun vulnerability: 2x damage
        if (enemy.state === 'staggered' || enemy.state === 'stunned') {
            finalDamage = damage * 2.0;
        }
        
        enemy.integrity -= finalDamage;
        enemy.flashTimer = 10;
        enemy.hitCooldown = 15;
        
        if (window.GameAudio && typeof window.GameAudio.playHit === 'function') {
            window.GameAudio.playHit();
        }
        
        if (window.GameEngine) {
            if (typeof window.GameEngine.shake === 'function') {
                window.GameEngine.shake(enemy.type === 'boss' ? 12 : 6);
            }
            if (typeof window.GameEngine.hitStop === 'function') {
                window.GameEngine.hitStop(enemy.type === 'boss' ? 80 : 40);
            }
            if (typeof window.GameEngine.spawnParticles === 'function') {
                window.GameEngine.spawnParticles(enemy.x, enemy.y, '#00ff66', enemy.type === 'boss' ? 20 : 8);
            }
        }
        
        if (enemy.integrity <= 0) {
            if (window.GameAudio && typeof window.GameAudio.playExplosion === 'function') {
                window.GameAudio.playExplosion();
            }
            if (window.GameEngine && typeof window.GameEngine.spawnParticles === 'function') {
                window.GameEngine.spawnParticles(enemy.x, enemy.y, '#ff0055', 25);
            }
            
            if (enemy.type === 'boss') {
                if (typeof window.triggerVictory === 'function') {
                    window.triggerVictory();
                }
            }
        }
    }

    // Detect collision between player slashes and active enemies
    function checkSlashCollisions() {
        const slashesToCheck = [];
        if (Array.isArray(window.activeSlashes)) {
            slashesToCheck.push(...window.activeSlashes);
        }
        if (window.activeSlash) {
            slashesToCheck.push(window.activeSlash);
        }
        if (window.Vitt && window.Vitt.activeSlash) {
            slashesToCheck.push(window.Vitt.activeSlash);
        }
        
        slashesToCheck.forEach(slash => {
            window.activeEnemies.forEach(enemy => {
                if (enemy.integrity <= 0 || enemy.isNPC) return; // Ignore NPCs
                
                enemy.hitBySlashes = enemy.hitBySlashes || [];
                if (enemy.hitBySlashes.includes(slash.id)) return;
                
                let hit = false;
                const ex = enemy.x;
                const ey = enemy.y;
                const ew = enemy.width || 20;
                const eh = enemy.height || 20;
                
                if (slash.radius) {
                    // Circle vs AABB
                    const closestX = Math.max(ex - ew/2, Math.min(slash.x, ex + ew/2));
                    const closestY = Math.max(ey - eh/2, Math.min(slash.y, ey + eh/2));
                    const dx = slash.x - closestX;
                    const dy = slash.y - closestY;
                    hit = (dx*dx + dy*dy) < (slash.radius * slash.radius);
                } else {
                    // AABB vs AABB
                    const sw = slash.width || 40;
                    const sh = slash.height || 40;
                    hit = (
                        slash.x - sw/2 < ex + ew/2 &&
                        slash.x + sw/2 > ex - ew/2 &&
                        slash.y - sh/2 < ey + eh/2 &&
                        slash.y + sh/2 > ey - eh/2
                    );
                }
                
                if (hit) {
                    enemy.hitBySlashes.push(slash.id);
                    takeDamage(enemy, slash.damage || 15);
                    spawnText(enemy.x, enemy.y - 20, `-${Math.round(slash.damage || 15)}`, '#00ff66');
                }
            });
        });
    }

    // Wrap Vitt's methods to intercept player actions
    function wrapVittMethods(vitt) {
        if (!vitt) return;
        
        // Wrap slash
        if (typeof vitt.slash === 'function' && !vitt.slash.isWrapped) {
            const originalSlash = vitt.slash;
            vitt.slash = function(...args) {
                const res = originalSlash.apply(this, args);
                triggerPlayerSlash();
                return res;
            };
            vitt.slash.isWrapped = true;
        }
        
        // Wrap useOverflow
        if (typeof vitt.useOverflow === 'function' && !vitt.useOverflow.isWrapped) {
            const originalOverflow = vitt.useOverflow;
            vitt.useOverflow = function(...args) {
                const res = originalOverflow.apply(this, args);
                triggerPlayerOverflow();
                return res;
            };
            vitt.useOverflow.isWrapped = true;
        }
    }

    // Trigger visual slash effect and slash hitbox
    let lastSlashTime = 0;
    function triggerPlayerSlash() {
        if (oscilloscopeActive || currentDialogue) return; // Block actions during dialogues or minigames
        
        const now = Date.now();
        if (now - lastSlashTime < 150) return;
        lastSlashTime = now;

        const target = window.Vitt;
        if (!target) return;
        
        const dir = target.facingDir || { x: 1, y: 0 };
        const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;
        const dx = dir.x / length;
        const dy = dir.y / length;
        
        const sx = target.x + dx * 32;
        const sy = target.y + dy * 32;
        
        const slash = {
            id: Math.random(),
            x: sx,
            y: sy,
            width: 48,
            height: 48,
            damage: target.damage || 15,
            lifetime: 8,
            dir: { x: dx, y: dy }
        };
        window.activeSlashes.push(slash);
        
        if (window.GameAudio && typeof window.GameAudio.playSlash === 'function') {
            window.GameAudio.playSlash();
        }
    }

    // Trigger visual overflow explosion and blast hitbox
    let lastOverflowTime = 0;
    function triggerPlayerOverflow() {
        if (oscilloscopeActive || currentDialogue) return;
        
        const now = Date.now();
        if (now - lastOverflowTime < 500) return;
        lastOverflowTime = now;

        const target = window.Vitt;
        if (!target) return;
        
        const blast = {
            id: Math.random(),
            x: target.x,
            y: target.y,
            radius: 130,
            damage: 20,
            lifetime: 15,
            isOverflow: true
        };
        window.activeSlashes.push(blast);
        
        target.overflowActive = true;
        setTimeout(() => {
            if (window.Vitt) window.Vitt.overflowActive = false;
        }, 300);
        
        if (window.GameAudio && typeof window.GameAudio.playExplosion === 'function') {
            window.GameAudio.playExplosion();
        }
        if (window.GameEngine && typeof window.GameEngine.shake === 'function') {
            window.GameEngine.shake(12);
        }
    }

    // Update active slashes and key fallbacks
    let slashKeyPressed = false;
    let overflowKeyPressed = false;
    let dialogueAdvanceKeyPressed = false;
    
    function updateSlashes() {
        // Dialogue progression input check
        if (currentDialogue) {
            if (currentDialogue.charsVisible === undefined) {
                currentDialogue.charsVisible = 0;
            }
            const rawLine = currentDialogue.lines[currentDialogue.lineIndex] || '';
            if (currentDialogue.charsVisible < rawLine.length) {
                const oldVisible = Math.floor(currentDialogue.charsVisible);
                currentDialogue.charsVisible += 0.8; // typing speed: 0.8 chars per frame
                const newVisible = Math.min(rawLine.length, Math.floor(currentDialogue.charsVisible));
                if (newVisible > oldVisible && newVisible < rawLine.length) {
                    if (window.GameAudio && typeof window.GameAudio.playCodeBeep === 'function') {
                        window.GameAudio.playCodeBeep();
                    }
                }
            }

            if (window.GameEngine && window.GameEngine.keys && window.GameEngine.keys['E']) {
                if (!dialogueAdvanceKeyPressed) {
                    dialogueAdvanceKeyPressed = true;
                    if (currentDialogue.charsVisible < rawLine.length) {
                        currentDialogue.charsVisible = rawLine.length;
                    } else {
                        currentDialogue.lineIndex++;
                        currentDialogue.charsVisible = 0;
                        if (currentDialogue.lineIndex >= currentDialogue.lines.length) {
                            const cb = currentDialogue.onClose;
                            currentDialogue = null;
                            if (typeof cb === 'function') cb();
                        }
                    }
                }
            } else {
                dialogueAdvanceKeyPressed = false;
            }
            
            // Block normal player actions while reading dialog
            if (window.GameEngine && window.GameEngine.keys) {
                window.GameEngine.keys['J'] = false;
                window.GameEngine.keys[' '] = false;
                window.GameEngine.keys['SPACE'] = false;
                window.GameEngine.keys['L'] = false;
                window.GameEngine.keys['Q'] = false;
                window.GameEngine.keys['R'] = false;
            }
            return; // stop input processing
        }
        
        // Minigame active block
        if (oscilloscopeActive) {
            updateOscilloscope();
            if (window.GameEngine && window.GameEngine.keys) {
                window.GameEngine.keys['J'] = false;
                window.GameEngine.keys[' '] = false;
                window.GameEngine.keys['SPACE'] = false;
                window.GameEngine.keys['L'] = false;
                window.GameEngine.keys['Q'] = false;
                window.GameEngine.keys['R'] = false;
                window.GameEngine.keys['E'] = false;
            }
            return;
        }

        // Fallback key detection
        if (window.GameEngine && window.GameEngine.keys) {
            const keys = window.GameEngine.keys;
            if (keys['J'] || keys[' '] || keys['SPACE']) {
                if (!slashKeyPressed) {
                    triggerPlayerSlash();
                    slashKeyPressed = true;
                }
            } else {
                slashKeyPressed = false;
            }

            if (keys['O']) {
                if (!overflowKeyPressed) {
                    triggerPlayerOverflow();
                    overflowKeyPressed = true;
                }
            } else {
                overflowKeyPressed = false;
            }
        }

        window.activeSlashes.forEach(slash => {
            slash.lifetime -= 1;
        });
        window.activeSlashes = window.activeSlashes.filter(slash => slash.lifetime > 0);
    }

    // Draw active slashes (neon green arcs or expanding blue circles for overflow)
    function drawSlashes(ctx) {
        window.activeSlashes.forEach(slash => {
            ctx.save();
            if (slash.isOverflow) {
                const progress = (15 - slash.lifetime) / 15;
                ctx.strokeStyle = `rgba(0, 242, 254, ${1 - progress})`;
                ctx.fillStyle = `rgba(0, 242, 254, ${(1 - progress) * 0.15})`;
                ctx.lineWidth = 4;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00f2fe';
                ctx.beginPath();
                ctx.arc(slash.x, slash.y, slash.radius * progress, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(0, 255, 102, 0.85)';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00ff66';
                ctx.beginPath();
                const angle = Math.atan2(slash.dir.y, slash.dir.x);
                ctx.arc(slash.x - slash.dir.x * 12, slash.y - slash.dir.y * 12, 28, angle - Math.PI / 2.5, angle + Math.PI / 2.5);
                ctx.stroke();
            }
            ctx.restore();
        });
    }

    // Update active projectiles (Null Pointer arrows and Boss Matrix rain)
    function updateProjectiles() {
        window.activeProjectiles.forEach(proj => {
            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.lifetime -= 1;
            
            if (proj.owner === 'enemy') {
                if (hitsPlayer({ type: 'aabb', x: proj.x, y: proj.y, width: proj.width, height: proj.height })) {
                    // Check if player is parrying to reflect
                    const target = window.Vitt;
                    if (target && (target.parryActive || target.parryTimer > 0 || target.isParrying)) {
                        proj.owner = 'player';
                        proj.vx = -proj.vx * 1.3;
                        proj.vy = -proj.vy * 1.3;
                        proj.lifetime = 120;
                        proj.symbol = proj.vx > 0 ? '===>' : '<===';
                        
                        if (window.GameAudio && typeof window.GameAudio.playParry === 'function') {
                            window.GameAudio.playParry();
                        }
                        if (window.GameEngine && typeof window.GameEngine.shake === 'function') {
                            window.GameEngine.shake(8);
                        }
                        spawnText(target.x, target.y - 35, "* PROYECTIL REFLEJADO *", "#00f2fe", 45);
                    } else {
                        damagePlayer(proj.damage, true, null);
                        proj.lifetime = 0;
                    }
                }
            } else if (proj.owner === 'player') {
                // Reflected projectile hits enemies
                window.activeEnemies.forEach(enemy => {
                    if (enemy.integrity <= 0 || (enemy.isNPC && enemy.type !== 'tutorial_drone')) return;
                    const ex = enemy.x;
                    const ey = enemy.y;
                    const ew = enemy.width || 20;
                    const eh = enemy.height || 20;
                    
                    const collides = (
                        proj.x - proj.width/2 < ex + ew/2 &&
                        proj.x + proj.width/2 > ex - ew/2 &&
                        proj.y - proj.height/2 < ey + eh/2 &&
                        proj.y + proj.height/2 > ey - eh/2
                    );
                    
                    if (collides) {
                        takeDamage(enemy, proj.damage * 1.6);
                        proj.lifetime = 0;
                    }
                });
            }
            
            // Check if player's slash dissolves projectile
            const slashesToCheck = [];
            if (Array.isArray(window.activeSlashes)) {
                slashesToCheck.push(...window.activeSlashes);
            }
            if (window.activeSlash) {
                slashesToCheck.push(window.activeSlash);
            }
            if (window.Vitt && window.Vitt.activeSlash) {
                slashesToCheck.push(window.Vitt.activeSlash);
            }
            
            slashesToCheck.forEach(slash => {
                const dx = proj.x - slash.x;
                const dy = proj.y - slash.y;
                const range = (slash.width || 40) * 0.8;
                if (Math.abs(dx) < range && Math.abs(dy) < range) {
                    proj.lifetime = 0;
                    if (window.GameEngine && typeof window.GameEngine.spawnParticles === 'function') {
                        window.GameEngine.spawnParticles(proj.x, proj.y, '#00f2fe', 4);
                    }
                }
            });
        });
        
        window.activeProjectiles = window.activeProjectiles.filter(proj => proj.lifetime > 0);
    }

    // Draw active projectiles
    function drawProjectiles(ctx) {
        window.activeProjectiles.forEach(proj => {
            ctx.save();
            ctx.font = "bold 15px 'Courier Prime', monospace";
            ctx.textAlign = 'center';
            ctx.fillStyle = proj.owner === 'player' ? '#00ff66' : '#ff0055';
            ctx.shadowBlur = 8;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fillText(proj.symbol, proj.x, proj.y + 4);
            ctx.restore();
        });
    }

    // Update active bits collectibles
    function updateCollectibles() {
        if (!window.Vitt) return;
        const px = window.Vitt.x;
        const py = window.Vitt.y;
        
        window.activeCollectibles.forEach(col => {
            const dx = px - col.x;
            const dy = py - col.y;
            if (dx*dx + dy*dy < 24*24) {
                // Collect!
                window.collectedBits = window.collectedBits || { bit1: false, bit3: false, bit5: false, bit7: false };
                window.collectedBits[col.id] = true;
                col.collected = true;
                
                if (window.GameAudio && typeof window.GameAudio.playLevelUp === 'function') {
                    window.GameAudio.playLevelUp();
                }
                spawnText(col.x, col.y - 15, `${col.label} OBTENIDO`, '#00f2fe', 60);
            }
        });
        window.activeCollectibles = window.activeCollectibles.filter(col => !col.collected);
    }

    // Draw active bits collectibles
    function drawCollectibles(ctx) {
        window.activeCollectibles.forEach(col => {
            ctx.save();
            ctx.font = "bold 12px 'Courier Prime', monospace";
            ctx.textAlign = 'center';
            
            // Bouncing float animation
            const bounce = Math.sin(Date.now() / 150) * 4;
            
            ctx.fillStyle = '#00f2fe';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f2fe';
            ctx.fillText(col.label, col.x, col.y + bounce);
            ctx.restore();
        });
    }

    // Oscilloscope Minigame Update Logic
    function updateOscilloscope() {
        sweepLineX += sweepDirection * sweepSpeed;
        if (sweepLineX >= 580) {
            sweepLineX = 580;
            sweepDirection = -1;
        } else if (sweepLineX <= 220) {
            sweepLineX = 220;
            sweepDirection = 1;
        }
        
        // Listen to Enter Key
        if (window.GameEngine && window.GameEngine.keys && (window.GameEngine.keys['ENTER'] || window.GameEngine.keys['Enter'])) {
            if (!enterKeyPressed) {
                enterKeyPressed = true;
                if (sweepLineX >= targetZoneX && sweepLineX <= targetZoneX + targetZoneW) {
                    // Success! Sincronización exitosa
                    oscilloscopeActive = false;
                    if (window.byteAAInstance) {
                        window.byteAAInstance.state = 'aligned';
                    }
                    // Full recovery
                    if (window.Vitt) {
                        if (window.Vitt.integrity !== undefined) window.Vitt.integrity = window.Vitt.maxIntegrity || 100;
                        if (window.Vitt.health !== undefined) window.Vitt.health = window.Vitt.maxHealth || 100;
                        if (window.Vitt.cpuCycles !== undefined) window.Vitt.cpuCycles = window.Vitt.maxCpuCycles || 100;
                        if (window.Vitt.stamina !== undefined) window.Vitt.stamina = window.Vitt.maxStamina || 100;
                    }
                    
                    if (window.GameAudio && typeof window.GameAudio.playLevelUp === 'function') {
                        window.GameAudio.playLevelUp();
                    }
                    spawnText(400, 300, "¡SINCRONIZACIÓN EXITOSA!", "#00ff66", 90);
                    if (typeof window.flashAlert === 'function') {
                        window.flashAlert("RELOJ ALINEADO - ACCESO CONCEDIDO", "cyan");
                    }
                } else {
                    // Missed alignment
                    if (window.GameAudio && typeof window.GameAudio.playHit === 'function') {
                        window.GameAudio.playHit();
                    }
                    if (window.GameEngine && typeof window.GameEngine.shake === 'function') {
                        window.GameEngine.shake(8);
                    }
                    spawnText(400, 300, "¡ERROR DE ALINEACIÓN!", "#ff0055", 60);
                    // Penalty
                    if (window.Vitt) {
                        if (window.Vitt.cpuCycles !== undefined) window.Vitt.cpuCycles = Math.max(0, window.Vitt.cpuCycles - 10);
                        if (window.Vitt.stamina !== undefined) window.Vitt.stamina = Math.max(0, window.Vitt.stamina - 10);
                    }
                }
            }
        } else {
            enterKeyPressed = false;
        }
    }

    // Oscilloscope Minigame Screen Draw
    function drawOscilloscope(ctx) {
        ctx.save();
        // Dim background focus
        ctx.fillStyle = 'rgba(5, 7, 10, 0.7)';
        ctx.fillRect(0, 0, 800, 600);
        
        const bx = 200, by = 150, bw = 400, bh = 300;
        
        // Scope casing
        ctx.fillStyle = 'rgba(10, 15, 20, 0.96)';
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 3;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        
        // Scope Title (Spanish)
        ctx.fillStyle = '#00ff66';
        ctx.font = "bold 15px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        ctx.fillText("OSCILOSCOPIO - ALINEACIÓN DE RELOJ", bx + bw/2, by + 30);
        
        // Grid lines
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = bx + 20; x < bx + bw; x += 30) {
            ctx.moveTo(x, by + 50); ctx.lineTo(x, by + bh - 50);
        }
        for (let y = by + 50; y < by + bh; y += 30) {
            ctx.moveTo(bx + 20, y); ctx.lineTo(bx + bw - 20, y);
        }
        ctx.stroke();
        
        // Target Blue Alignment Zone
        ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.fillRect(targetZoneX, by + 60, targetZoneW, bh - 120);
        ctx.strokeRect(targetZoneX, by + 60, targetZoneW, bh - 120);
        
        // Sine wave sweep signal
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ff66';
        ctx.beginPath();
        for (let x = bx + 20; x < bx + bw - 20; x++) {
            const waveOffset = Date.now() / 90;
            const y = by + bh/2 + Math.sin((x - bx) * 0.05 + waveOffset) * 45;
            if (x === bx + 20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Vertical indicator sweep line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(sweepLineX, by + 60);
        ctx.lineTo(sweepLineX, by + bh - 60);
        ctx.stroke();
        
        // Prompt (Spanish)
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 13px 'Courier Prime', monospace";
        ctx.shadowBlur = 0;
        ctx.fillText("PRESIONA [ENTER] EN LA MARCA CELESTE", bx + bw/2, by + bh - 25);
        ctx.restore();
    }


    // --- SPECIFIC ENEMY & NPC UPDATE METHODS ---

    // 1. Daemon Thread (&)
    function updateDaemon(dt) {
        if (this.stunTimer > 0) {
            this.stunTimer -= 1;
            this.state = 'stunned';
            return;
        }
        
        if (this.hitCooldown > 0) this.hitCooldown -= 1;
        
        const target = window.Vitt;
        if (!target) return;
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        
        switch (this.state) {
            case 'stunned':
                if (this.stunTimer <= 0) {
                    this.state = 'chase';
                }
                break;
                
            case 'chase':
                if (dist > 25) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
                if (dist < 65) {
                    this.state = 'windup';
                    this.stateTimer = 22;
                }
                break;
                
            case 'windup':
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    this.state = 'strike1';
                    this.stateTimer = 10;
                    this.strikeDir = { x: dx / dist, y: dy / dist };
                }
                break;
                
            case 'strike1':
                this.x += this.strikeDir.x * 8.5;
                this.y += this.strikeDir.y * 8.5;
                
                if (hitsPlayer({ type: 'circle', x: this.x, y: this.y, radius: 24 })) {
                    damagePlayer(14, true, this);
                    this.state = 'strike_delay';
                    this.stateTimer = 12;
                }
                
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    this.state = 'strike_delay';
                    this.stateTimer = 12;
                }
                break;
                
            case 'strike_delay':
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    this.state = 'strike2';
                    this.stateTimer = 10;
                    const ndx = target.x - this.x;
                    const ndy = target.y - this.y;
                    const ndist = Math.sqrt(ndx*ndx + ndy*ndy) || 1;
                    this.strikeDir = { x: ndx / ndist, y: ndy / ndist };
                }
                break;
                
            case 'strike2':
                this.x += this.strikeDir.x * 8.5;
                this.y += this.strikeDir.y * 8.5;
                
                if (hitsPlayer({ type: 'circle', x: this.x, y: this.y, radius: 24 })) {
                    damagePlayer(14, true, this);
                    this.state = 'recover';
                    this.stateTimer = 70;
                }
                
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    this.state = 'recover';
                    this.stateTimer = 70;
                }
                break;
                
            case 'recover':
                this.stateTimer -= 1;
                this.x += (dx / dist) * (this.speed * 0.3);
                this.y += (dy / dist) * (this.speed * 0.3);
                if (this.stateTimer <= 0) {
                    this.state = 'chase';
                }
                break;
        }
    }

    // 2. Memory Leak (~)
    function updateLeak(dt) {
        if (this.stunTimer > 0) {
            this.stunTimer -= 1;
            this.state = 'stunned';
            return;
        }
        
        if (this.hitCooldown > 0) this.hitCooldown -= 1;
        
        const target = window.Vitt;
        if (!target) return;
        
        // Drop slime trail
        this.slimeTimer = (this.slimeTimer || 0) + 1;
        if (this.slimeTimer >= 16 && this.state !== 'project_charge' && this.state !== 'project_spill') {
            this.slimeTimer = 0;
            this.slimeTrail.push({
                x: this.x,
                y: this.y,
                radius: 18,
                lifetime: 240
            });
        }
        
        this.slimeTrail.forEach(slime => {
            slime.lifetime -= 1;
        });
        this.slimeTrail = this.slimeTrail.filter(slime => slime.lifetime > 0);
        
        // Slime collision
        if (!isVittInvulnerable()) {
            let stepped = false;
            for (let i = 0; i < this.slimeTrail.length; i++) {
                const slime = this.slimeTrail[i];
                const dx = target.x - slime.x;
                const dy = target.y - slime.y;
                if (dx*dx + dy*dy < slime.radius * slime.radius) {
                    stepped = true;
                    break;
                }
            }
            if (stepped) {
                damagePlayer(0.35, false);
            }
        }
        
        this.projectionTimer = (this.projectionTimer || 180) - 1;
        
        if (this.state === 'stunned') {
            if (this.stunTimer <= 0) {
                this.state = 'normal';
            }
            return;
        }
        
        if (this.state === 'project_charge') {
            this.stateTimer -= 1;
            if (this.stateTimer <= 0) {
                this.state = 'project_spill';
                this.stateTimer = 55;
                if (window.GameAudio && typeof window.GameAudio.playAlarm === 'function') {
                    window.GameAudio.playAlarm(0.8);
                }
            }
        } else if (this.state === 'project_spill') {
            this.stateTimer -= 1;
            
            if (!isVittInvulnerable()) {
                const px = target.x, py = target.y;
                const pw = target.width || 20, ph = target.height || 20;
                
                const inVertical = Math.abs(px - this.x) < (12 + pw/2);
                const inHorizontal = Math.abs(py - this.y) < (12 + ph/2);
                
                if (inVertical || inHorizontal) {
                    damagePlayer(1.6, false);
                }
            }
            
            if (this.stateTimer <= 0) {
                this.state = 'normal';
                this.projectionTimer = 190;
            }
        } else {
            this.state = 'normal';
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            if (dist > 15) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
            
            if (this.projectionTimer <= 0) {
                this.state = 'project_charge';
                this.stateTimer = 50;
            }
        }
    }

    // 3. Null Pointer (Ø)
    function updateNullPointer(dt) {
        if (this.stunTimer > 0) {
            this.stunTimer -= 1;
            this.state = 'stunned';
            return;
        }
        
        if (this.hitCooldown > 0) this.hitCooldown -= 1;
        
        const target = window.Vitt;
        if (!target) return;
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        
        if (this.state === 'stunned') {
            if (this.stunTimer <= 0) {
                this.state = 'scan';
            }
            return;
        }
        
        if (this.state === 'scan') {
            const scanWidth = 18;
            const inHorizontal = Math.abs(dy) < scanWidth;
            const inVertical = Math.abs(dx) < scanWidth;
            
            if (inHorizontal || inVertical) {
                if (inHorizontal) {
                    this.shootDir = { x: Math.sign(dx), y: 0 };
                } else {
                    this.shootDir = { x: 0, y: Math.sign(dy) };
                }
                this.state = 'alert';
                this.stateTimer = 18;
                if (window.GameAudio && typeof window.GameAudio.playAlarm === 'function') {
                    window.GameAudio.playAlarm(0.5);
                }
            }
        } else if (this.state === 'alert') {
            this.stateTimer -= 1;
            if (this.stateTimer <= 0) {
                this.state = 'shoot';
            }
        } else if (this.state === 'shoot') {
            const arrowSpeed = 12.5;
            const arrow = {
                id: Math.random(),
                x: this.x,
                y: this.y,
                vx: this.shootDir.x * arrowSpeed,
                vy: this.shootDir.y * arrowSpeed,
                width: 26,
                height: 8,
                symbol: this.shootDir.x !== 0 ? (this.shootDir.x > 0 ? '===>' : '<===') : '|||',
                owner: 'enemy',
                damage: 26,
                lifetime: 100
            };
            window.activeProjectiles.push(arrow);
            
            this.state = 'cooldown';
            this.stateTimer = 85;
        } else if (this.state === 'cooldown') {
            this.stateTimer -= 1;
            if (this.stateTimer <= 0) {
                this.state = 'scan';
            }
        }
    }

    // 4. Boss: OOM Killer ([OOM] / [| K |] / [/ _ \])
    function updateBoss(dt) {
        if (this.stunTimer > 0) {
            this.stunTimer -= 1;
            this.state = 'stunned';
            
            const target = window.Vitt;
            if (target && this.fallingChars) {
                this.fallingChars.forEach(char => { char.y += char.vy; });
                this.fallingChars = this.fallingChars.filter(char => char.y < 600);
            }
            return;
        }
        
        if (this.hitCooldown > 0) this.hitCooldown -= 1;
        
        const target = window.Vitt;
        if (!target) return;
        
        // Phase transition under 50% HP
        if (this.integrity < 500 && !this.phase2Started) {
            this.state = 'overclock_transition';
            this.stateTimer = 90;
            this.phase2Started = true;
            this.fallingChars = [];
            
            if (window.GameAudio && typeof window.GameAudio.playAlarm === 'function') {
                window.GameAudio.playAlarm(1.5);
            }
            return;
        }
        
        if (this.state === 'stunned') {
            if (this.stunTimer <= 0) {
                this.state = this.phase2Started ? 'p2_drift' : 'drift';
                this.stateTimer = 120;
            }
            return;
        }
        
        // Active Matrix Falling Characters in Phase 2
        if (this.phase2Started) {
            const spawnChance = window.graphicsProfile === 'low' ? 0.04 : 0.22;
            if (Math.random() < spawnChance) {
                const symbols = ['0', '1', 'A', 'F', '%', '$', '#', '@', '{', '}', ';', '[', ']'];
                this.fallingChars.push({
                    x: Math.random() * 800,
                    y: 0,
                    vy: 5.5 + Math.random() * 4.5,
                    symbol: symbols[Math.floor(Math.random() * symbols.length)]
                });
            }
            
            this.fallingChars.forEach(char => {
                char.y += char.vy;
                
                if (!isVittInvulnerable()) {
                    const px = target.x, py = target.y;
                    const pw = target.width || 20, ph = target.height || 20;
                    
                    if (Math.abs(char.x - px) < (11 + pw/2) && Math.abs(char.y - py) < (14 + ph/2)) {
                        damagePlayer(4.5, false);
                        char.y = 9999;
                    }
                }
            });
            this.fallingChars = this.fallingChars.filter(char => char.y < 600);
        }
        
        switch (this.state) {
            case 'overclock_transition':
                this.stateTimer -= 1;
                if (window.GameEngine && typeof window.GameEngine.shake === 'function') {
                    window.GameEngine.shake(5);
                }
                if (this.stateTimer <= 0) {
                    this.state = 'p2_drift';
                    this.stateTimer = 150;
                    this.p2AttackTimer = 380;
                }
                break;
                
            case 'drift':
            case 'p2_drift':
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                
                this.x = Math.max(120, Math.min(680, this.x));
                this.y = Math.max(100, Math.min(300, this.y));
                
                this.stateTimer -= 1;
                
                if (this.state === 'p2_drift') {
                    this.p2AttackTimer = (this.p2AttackTimer || 380) - 1;
                    if (this.p2AttackTimer <= 0) {
                        this.state = 'countdown';
                        this.stateTimer = 180;
                        this.targetX = 400;
                        this.targetY = 150;
                        break;
                    }
                }
                
                if (this.stateTimer <= 0) {
                    if (this.state === 'p2_drift') {
                        if (Math.random() < 0.55) {
                            this.state = 'laser_charge';
                            this.stateTimer = 35;
                            this.laserX = Math.random() < 0.5 ? 100 : 700;
                            this.laserDir = this.laserX === 100 ? 1 : -1;
                        } else {
                            this.state = 'slam_charge';
                            this.stateTimer = 55;
                        }
                    } else {
                        if (Math.random() < 0.5) {
                            this.state = 'laser_charge';
                            this.stateTimer = 45;
                            this.laserX = Math.random() < 0.5 ? 100 : 700;
                            this.laserDir = this.laserX === 100 ? 1 : -1;
                        } else {
                            this.state = 'slam_charge';
                            this.stateTimer = 75;
                        }
                    }
                }
                break;
                
            case 'laser_charge':
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    this.state = 'laser_sweep';
                    this.stateTimer = 150;
                }
                break;
                
            case 'laser_sweep':
                const sweepSpeed = this.phase2Started ? 6.2 : 4.6;
                this.laserX += this.laserDir * sweepSpeed;
                
                if (!isVittInvulnerable()) {
                    const px = target.x;
                    const pw = target.width || 20;
                    if (Math.abs(px - this.laserX) < (12 + pw/2)) {
                        damagePlayer(15, false);
                    }
                }
                
                this.stateTimer -= 1;
                if (this.stateTimer <= 0 || this.laserX < 0 || this.laserX > 800) {
                    this.state = this.phase2Started ? 'p2_drift' : 'drift';
                    this.stateTimer = 120;
                }
                break;
                
            case 'slam_charge':
                this.stateTimer -= 1;
                const chargeDuration = this.phase2Started ? 55 : 75;
                this.yOffset = -18 * Math.sin((1 - this.stateTimer / chargeDuration) * Math.PI);
                if (this.stateTimer <= 0) {
                    this.state = 'slam_execute';
                    this.stateTimer = 15;
                }
                break;
                
            case 'slam_execute':
                this.yOffset = 12;
                
                if (window.GameAudio && typeof window.GameAudio.playHit === 'function') {
                    window.GameAudio.playHit();
                }
                if (window.GameEngine) {
                    if (typeof window.GameEngine.shake === 'function') window.GameEngine.shake(18);
                    if (typeof window.GameEngine.spawnParticles === 'function') {
                        window.GameEngine.spawnParticles(this.x, this.y + 40, '#ff0055', 25);
                    }
                }
                
                const pDist = Math.sqrt((target.x - this.x)*(target.x - this.x) + (target.y - this.y)*(target.y - this.y));
                if (pDist < 210) {
                    damagePlayer(45, true, this);
                }
                
                this.state = 'slam_recover';
                this.stateTimer = 30;
                break;
                
            case 'slam_recover':
                this.stateTimer -= 1;
                this.yOffset = 12 * (this.stateTimer / 30);
                if (this.stateTimer <= 0) {
                    this.yOffset = 0;
                    this.state = this.phase2Started ? 'p2_drift' : 'drift';
                    this.stateTimer = 120;
                }
                break;
                
            case 'countdown':
                this.x += (this.targetX - this.x) * 0.06;
                this.y += (this.targetY - this.y) * 0.06;
                
                this.stateTimer -= 1;
                
                let isInterrupted = false;
                if (target && target.overflowActive === true) {
                    isInterrupted = true;
                }
                if (window.GameEngine && window.GameEngine.keys && window.GameEngine.keys['O']) {
                    isInterrupted = true;
                }
                
                if (isInterrupted) {
                    const px = target.x, py = target.y;
                    const distToBoss = Math.sqrt((px - this.x)*(px - this.x) + (py - this.y)*(py - this.y));
                    if (distToBoss < 350) {
                        this.state = 'stunned';
                        this.stunTimer = 180;
                        this.integrity -= 150;
                        this.flashTimer = 20;
                        
                        spawnText(this.x, this.y - 120, "¡OVERFLOW DETECTADO!", "#00f2fe", 90);
                        spawnText(this.x, this.y - 140, "-150 CORE INTEGRIDAD", "#00ff66", 90);
                        
                        if (window.GameAudio) {
                            if (typeof window.GameAudio.playExplosion === 'function') window.GameAudio.playExplosion();
                            if (typeof window.GameAudio.playParry === 'function') window.GameAudio.playParry();
                        }
                        if (window.GameEngine) {
                            if (typeof window.GameEngine.shake === 'function') window.GameEngine.shake(20);
                            if (typeof window.GameEngine.hitStop === 'function') window.GameEngine.hitStop(200);
                            if (typeof window.GameEngine.spawnParticles === 'function') {
                                window.GameEngine.spawnParticles(this.x, this.y, '#00f2fe', 40);
                                window.GameEngine.spawnParticles(this.x, this.y, '#00ff66', 20);
                            }
                        }
                        
                        this.p2AttackTimer = 780;
                        break;
                    }
                }
                
                if (this.stateTimer <= 0) {
                    if (window.GameAudio && typeof window.GameAudio.playExplosion === 'function') {
                        window.GameAudio.playExplosion();
                    }
                    if (window.GameEngine && typeof window.GameEngine.shake === 'function') {
                        window.GameEngine.shake(30);
                    }
                    
                    spawnText(400, 300, "[ERROR CRÍTICO: FALLO DE PÁGINA]", "#ff0055", 120);
                    damagePlayer(100, false);
                    
                    this.state = 'p2_drift';
                    this.stateTimer = 180;
                    this.p2AttackTimer = 780;
                }
                break;
        }
    }

    // 5. PT_Oracle NPC (Stationary tree symbol)
    function updateOracle(dt) {
        const target = window.Vitt;
        if (!target) return;
        
        // Dialogue interaction trigger
        if (!currentDialogue && window.GameEngine && window.GameEngine.keys && window.GameEngine.keys['E']) {
            if (!this.interactKeyPressed) {
                this.interactKeyPressed = true;
                
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                if (dx*dx + dy*dy < 50*50) {
                    // Start Dialogue in Spanish
                    currentDialogue = {
                        speaker: "PT_Oracle",
                        lines: [
                            "PT_Oracle: Saludos, Puntero. El Sector SWAP está sufriendo una Muerte Térmica.",
                            "PT_Oracle: Debes escoltar a Bit-0 hasta la dirección de memoria 0x0000_F8D2.",
                            "PT_Oracle: Si te alejas de él, su voltaje decaerá. Presiona [R] cerca de él para restaurarlo.",
                            "PT_Oracle: Busca también a Byte-0xAA. Necesita recuperar sus 4 bits de registro perdidos.",
                            "PT_Oracle: ¡Que la coherencia de caché te guíe en tu travesía!"
                        ],
                        lineIndex: 0,
                        cooldown: 20
                    };
                }
            }
        } else if (!window.GameEngine || !window.GameEngine.keys || !window.GameEngine.keys['E']) {
            this.interactKeyPressed = false;
        }
    }

    // 6. Bit-0 NPC (Escort)
    function updateBit0(dt) {
        const target = window.Vitt;
        if (!target) return;
        
        // Check if voltage is zero -> Explodes
        if (this.voltage <= 0) {
            this.symbol = '1';
            this.state = 'hostile_explode';
            this.stateTimer = (this.stateTimer || 20) - 1;
            this.flashTimer = 5;
            
            if (this.stateTimer <= 0) {
                if (window.GameAudio && typeof window.GameAudio.playExplosion === 'function') {
                    window.GameAudio.playExplosion();
                }
                if (window.GameEngine) {
                    if (typeof window.GameEngine.shake === 'function') window.GameEngine.shake(25);
                    if (typeof window.GameEngine.spawnParticles === 'function') {
                        window.GameEngine.spawnParticles(this.x, this.y, '#ff0055', 30);
                    }
                }
                
                // Explode damage to player if close
                const pDx = target.x - this.x;
                const pDy = target.y - this.y;
                const pDist = Math.sqrt(pDx*pDx + pDy*pDy);
                if (pDist < 120) {
                    damagePlayer(50, false);
                }
                
                spawnText(this.x, this.y, "¡BIT EXPLOTADO!", "#ff0055", 60);
                this.integrity = 0; // Destroy
            }
            return;
        }
        
        // Escort pathing to destination portal
        const destX = 700;
        const destY = 300;
        const dx = destX - this.x;
        const dy = destY - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        
        if (dist > 15) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            if (!this.reachedDestination) {
                this.reachedDestination = true;
                spawnText(this.x, this.y - 20, "¡BIT-0 SEGURO!", "#00ff66", 90);
                if (window.GameAudio && typeof window.GameAudio.playLevelUp === 'function') {
                    window.GameAudio.playLevelUp();
                }
                if (typeof window.flashAlert === 'function') {
                    window.flashAlert("BIT-0 ENTREGADO CON ÉXITO", "green");
                }
            }
        }
        
        // Distance check for Voltage Decay
        const pDx = target.x - this.x;
        const pDy = target.y - this.y;
        const pDist = Math.sqrt(pDx*pDx + pDy*pDy);
        
        if (pDist > 150) {
            this.voltage = Math.max(0, this.voltage - 0.12);
            this.isDecaying = true;
        } else {
            this.isDecaying = false;
        }
        
        // Restoring voltage (Press R near Bit-0, costs 25 CPU)
        if (pDist < 60) {
            if (window.GameEngine && window.GameEngine.keys && window.GameEngine.keys['R']) {
                if (!this.restoreKeyPressed) {
                    this.restoreKeyPressed = true;
                    const cost = 25;
                    const cycles = target.cpuCycles !== undefined ? target.cpuCycles : target.stamina;
                    
                    if (cycles >= cost && this.voltage < 100) {
                        if (target.cpuCycles !== undefined) target.cpuCycles -= cost;
                        else if (target.stamina !== undefined) target.stamina -= cost;
                        
                        this.voltage = Math.min(100, this.voltage + 30);
                        spawnText(this.x, this.y - 25, "+30 VOLTAJE (-25 CPU)", "#00f2fe", 60);
                        
                        if (window.GameAudio && typeof window.GameAudio.playLevelUp === 'function') {
                            window.GameAudio.playLevelUp();
                        }
                    }
                }
            } else {
                this.restoreKeyPressed = false;
            }
        }
        
        // Spawn spikes
        this.spikeTimer = (this.spikeTimer || 120) - 1;
        if (this.spikeTimer <= 0 && dist > 25) {
            this.spikeTimer = 135;
            this.spikes.push({
                x: this.x,
                y: this.y + 6,
                width: 28,
                height: 14,
                lifetime: 180
            });
        }
        
        // Update spikes
        this.spikes.forEach(spike => {
            spike.lifetime -= 1;
            if (!isVittInvulnerable()) {
                const spDx = target.x - spike.x;
                const spDy = target.y - spike.y;
                if (Math.abs(spDx) < (spike.width/2 + target.width/2) && Math.abs(spDy) < (spike.height/2 + target.height/2)) {
                    damagePlayer(12, true, null);
                    spike.lifetime = 0;
                }
            }
        });
        this.spikes = this.spikes.filter(spike => spike.lifetime > 0);
    }

    // 7. Byte-0xAA NPC
    function updateByte0xAA(dt) {
        const target = window.Vitt;
        if (!target) return;
        
        if (!currentDialogue && !oscilloscopeActive && window.GameEngine && window.GameEngine.keys && window.GameEngine.keys['E']) {
            if (!this.interactKeyPressed) {
                this.interactKeyPressed = true;
                
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                if (dx*dx + dy*dy < 50*50) {
                    if (this.state === 'collect_bits') {
                        const bits = window.collectedBits || { bit1: false, bit3: false, bit5: false, bit7: false };
                        if (bits.bit1 && bits.bit3 && bits.bit5 && bits.bit7) {
                            currentDialogue = {
                                speaker: "Byte-0xAA",
                                lines: [
                                    "Byte-0xAA: ¡Excelente! Has recuperado todos mis bits de registro.",
                                    "Byte-0xAA: Siguiente paso: alinear el reloj de sincronización del bus.",
                                    "Byte-0xAA: Abriendo panel del osciloscopio..."
                                ],
                                lineIndex: 0,
                                cooldown: 20,
                                onClose: () => {
                                    oscilloscopeActive = true;
                                    sweepLineX = 220;
                                    targetZoneX = 300 + Math.random() * 160;
                                    enterKeyPressed = true;
                                }
                            };
                        } else {
                            currentDialogue = {
                                speaker: "Byte-0xAA",
                                lines: [
                                    "Byte-0xAA: ¡Error de paridad! He perdido 4 bits en este sector corrupto.",
                                    "Byte-0xAA: Derrota a los Guardianes del Registro para recuperar mis bits.",
                                    "Byte-0xAA: Necesito: [Bit-1: 0], [Bit-3: 0], [Bit-5: 1], y [Bit-7: 1]."
                                ],
                                lineIndex: 0,
                                cooldown: 20
                            };
                            
                            if (!this.guardiansSpawned) {
                                this.guardiansSpawned = true;
                                window.Enemies.spawnEliteWarden(200, 150, "[Bit-1: 0]", "bit1");
                                window.Enemies.spawnEliteWarden(600, 120, "[Bit-3: 0]", "bit3");
                                window.Enemies.spawnEliteWarden(180, 480, "[Bit-5: 1]", "bit5");
                                window.Enemies.spawnEliteWarden(620, 450, "[Bit-7: 1]", "bit7");
                                
                                if (typeof window.flashAlert === 'function') {
                                    window.flashAlert("SEGURIDAD ACTIVADA - BUSCANDO BITS DE REGISTRO", "red");
                                }
                            }
                        }
                    } else if (this.state === 'aligned') {
                        currentDialogue = {
                            speaker: "Byte-0xAA",
                            lines: [
                                "Byte-0xAA: ¡Sincronización completada! El reloj del bus de datos está alineado.",
                                "Byte-0xAA: Has restaurado la integridad del sistema. El portal del cortafuegos está abierto."
                            ],
                            lineIndex: 0,
                            cooldown: 20
                        };
                    }
                }
            }
        } else if (!window.GameEngine || !window.GameEngine.keys || !window.GameEngine.keys['E']) {
            this.interactKeyPressed = false;
        }
    }

    // 8. Boss: The Spindle Golem (Golem del Cabezal)
    function updateSpindleGolem(dt) {
        if (this.stunTimer > 0) {
            this.stunTimer -= 1;
            this.state = 'staggered';
            return;
        }
        
        if (this.hitCooldown > 0) this.hitCooldown -= 1;
        
        const target = window.Vitt;
        if (!target) return;
        
        switch (this.state) {
            case 'dormant':
                // Stay at initial spawn coordinates on the right side
                this.x = 650;
                this.y = 290;
                if (target.x > 580) { // Wakes up when player enters the arena
                    this.state = 'drift';
                    this.stateTimer = 90;
                    if (typeof window.flashAlert === 'function') {
                        window.flashAlert("¡GOLEM DEL CABEZAL DESPERTADO!", "red");
                    }
                }
                break;

            case 'staggered':
                if (this.stunTimer <= 0) {
                    this.state = 'drift';
                    this.stateTimer = 120;
                }
                break;
                
            case 'drift':
                // Drift inside its own arena on the right side of the screen
                this.x += (620 - this.x) * 0.03;
                this.y += (290 - this.y) * 0.03;
                
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    const rand = Math.random();
                    if (rand < 0.4) {
                        this.state = 'warning';
                        this.attackType = 'sweep';
                        const lanesOpt = Math.random();
                        if (lanesOpt < 0.35) {
                            this.sweptLanes = [1, 2];
                            this.warningMsg = "[!] ALERTA: BARRIDO DE CABEZAL EN LANES 1 Y 2";
                        } else if (lanesOpt < 0.7) {
                            this.sweptLanes = [2, 3];
                            this.warningMsg = "[!] ALERTA: BARRIDO DE CABEZAL EN LANES 2 Y 3";
                        } else {
                            this.sweptLanes = [1, 3];
                            this.warningMsg = "[!] ALERTA: BARRIDO DE CABEZAL EN LANES 1 Y 3";
                        }
                        this.stateTimer = 75;
                    } else if (rand < 0.75) {
                        this.state = 'warning';
                        this.attackType = 'discharge';
                        this.dischargeLane = Math.floor(Math.random() * 3) + 1;
                        this.warningMsg = `[!] ALERTA: DESCARGA ELÉCTRICA EN CARRIL ${this.dischargeLane}`;
                        this.stateTimer = 75;
                    } else {
                        this.state = 'warning';
                        this.attackType = 'purge';
                        this.warningMsg = "[!] ALERTA: PURGA DE VOLTAJE EN TODOS LOS CARRILES";
                        this.stateTimer = 90;
                    }
                }
                break;
                
            case 'warning':
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    if (this.attackType === 'sweep') {
                        this.state = 'execute_sweep';
                        this.stateTimer = 25;
                        this.sweepX = 450; // Sweep starts at arena boundary x = 450
                    } else if (this.attackType === 'discharge') {
                        this.state = 'execute_discharge';
                        this.stateTimer = 100;
                    } else if (this.attackType === 'purge') {
                        this.state = 'execute_purge';
                        this.stateTimer = 15;
                    }
                }
                break;
                
            case 'execute_sweep':
                this.sweepX += 45;
                
                let playerLane = 2;
                if (target.y < 235) playerLane = 1;
                else if (target.y >= 365) playerLane = 3;
                
                if (this.sweptLanes.includes(playerLane) && this.sweepX >= target.x - 50 && this.sweepX <= target.x + 50) {
                    if (!isVittInvulnerable()) {
                        const isParrying = target.parryActive || target.parryTimer > 0 || target.isParrying;
                        if (isParrying) {
                            this.state = 'staggered';
                            this.stunTimer = 180;
                            this.integrity -= 80;
                            this.flashTimer = 20;
                            
                            spawnText(this.x, this.y - 80, "¡CABEZAL DESVIADO!", "#00f2fe", 60);
                            spawnText(this.x, this.y - 100, "-80 GOLEM INTEGRIDAD", "#00ff66", 60);
                            
                            if (window.GameAudio) {
                                if (typeof window.GameAudio.playParry === 'function') window.GameAudio.playParry();
                                if (typeof window.GameAudio.playExplosion === 'function') window.GameAudio.playExplosion();
                            }
                            if (window.GameEngine) {
                                if (typeof window.GameEngine.shake === 'function') window.GameEngine.shake(18);
                                if (typeof window.GameEngine.hitStop === 'function') window.GameEngine.hitStop(180);
                                if (typeof window.GameEngine.spawnParticles === 'function') {
                                    window.GameEngine.spawnParticles(this.x, this.y, '#00f2fe', 30);
                                }
                            }
                            break;
                        } else {
                            damagePlayer(35, true, this);
                            this.sweepX = 9999; // Only hit once
                        }
                    }
                }
                
                this.stateTimer -= 1;
                if (this.stateTimer <= 0 || this.sweepX > 950) {
                    this.state = 'drift';
                    this.stateTimer = 120;
                }
                break;
                
            case 'execute_discharge':
                let pL = 2;
                if (target.y < 235) pL = 1;
                else if (target.y >= 365) pL = 3;
                
                // Damage only if player is in the arena (x >= 450)
                if (pL === this.dischargeLane && !isVittInvulnerable() && target.x >= 450) {
                    damagePlayer(1.8, false);
                }
                
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    this.state = 'drift';
                    this.stateTimer = 120;
                }
                break;
                
            case 'execute_purge':
                if (this.stateTimer === 14) {
                    // Damage only if player is in the arena (x >= 450)
                    if (!isVittInvulnerable() && target.x >= 450) {
                        const isParrying = target.parryActive || target.parryTimer > 0 || target.isParrying;
                        if (isParrying && target.parryTimer > 7) {
                            if (window.GameAudio && typeof window.GameAudio.playParry === 'function') {
                                window.GameAudio.playParry();
                            }
                            spawnText(target.x, target.y - 35, "¡PURGA CONTRARRESTADA!", "#00f2fe", 60);
                        } else {
                            damagePlayer(40, true, this);
                        }
                    }
                    
                    if (window.GameAudio && typeof window.GameAudio.playExplosion === 'function') {
                        window.GameAudio.playExplosion();
                    }
                    if (window.GameEngine && typeof window.GameEngine.shake === 'function') {
                        window.GameEngine.shake(20);
                    }
                }
                
                this.stateTimer -= 1;
                if (this.stateTimer <= 0) {
                    this.state = 'drift';
                    this.stateTimer = 120;
                }
                break;
        }
    }


    // --- SPECIFIC ENEMY DRAWING METHODS ---

    // 1. Daemon Thread (&)
    function drawDaemon(ctx) {
        ctx.save();
        ctx.font = "bold 20px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        
        let color = '#ff0055';
        if (this.state === 'stunned') color = '#ffff66';
        else if (this.state === 'windup') color = '#ffcc00';
        else if (this.state === 'strike1' || this.state === 'strike2') color = '#00f2fe';
        
        if (this.flashTimer > 0) color = '#ffffff';
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        
        let jx = 0, jy = 0;
        if (this.state === 'windup') {
            jx = (Math.random() - 0.5) * 4;
            jy = (Math.random() - 0.5) * 4;
            
            ctx.fillStyle = '#ff0055';
            ctx.font = "bold 13px 'Courier Prime', monospace";
            ctx.fillText('!', this.x, this.y - 16);
            ctx.fillStyle = color;
            ctx.font = "bold 20px 'Courier Prime', monospace";
        }
        
        ctx.fillText('&', this.x + jx, this.y + jy);
        
        if (this.state === 'strike1' || this.state === 'strike2') {
            ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
            ctx.fillText('&', this.x - this.strikeDir.x * 16, this.y - this.strikeDir.y * 16);
            ctx.fillText('&', this.x - this.strikeDir.x * 32, this.y - this.strikeDir.y * 32);
            
            ctx.fillStyle = '#00f2fe';
            ctx.fillText('<<', this.x + this.strikeDir.x * 22, this.y + this.strikeDir.y * 22);
        }
        ctx.restore();
    }

    // 2. Memory Leak (~)
    function drawLeak(ctx) {
        ctx.save();
        
        ctx.fillStyle = 'rgba(0, 255, 102, 0.14)';
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.25)';
        ctx.lineWidth = 1;
        this.slimeTrail.forEach(slime => {
            ctx.beginPath();
            ctx.arc(slime.x, slime.y, slime.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
            ctx.font = "9px 'Courier Prime', monospace";
            ctx.fillText('.', slime.x - 4, slime.y + 1);
            ctx.fillText('*', slime.x + 4, slime.y - 2);
            ctx.fillStyle = 'rgba(0, 255, 102, 0.14)';
        });
        
        if (this.state === 'project_charge') {
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.beginPath(); ctx.moveTo(this.x, 0); ctx.lineTo(this.x, 600); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, this.y); ctx.lineTo(800, this.y); ctx.stroke();
        } else if (this.state === 'project_spill') {
            ctx.fillStyle = 'rgba(0, 255, 102, 0.35)';
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.75)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00ff66';
            
            ctx.fillRect(this.x - 12, 0, 24, 600);
            ctx.strokeRect(this.x - 12, 0, 24, 600);
            ctx.fillRect(0, this.y - 12, 800, 24);
            ctx.strokeRect(0, this.y - 12, 800, 24);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = "bold 13px 'Courier Prime', monospace";
            for (let i = 0; i < 4; i++) {
                ctx.fillText('~', this.x + (Math.random()-0.5)*18, Math.random()*600);
                ctx.fillText('~', Math.random()*800, this.y + (Math.random()-0.5)*18);
            }
        }
        
        ctx.font = "bold 24px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        
        let color = '#00ff66';
        if (this.state === 'stunned') color = '#ffff66';
        else if (this.state === 'project_charge') {
            color = Math.floor(Date.now() / 150) % 2 === 0 ? '#ffcc00' : '#00ff66';
            
            ctx.fillStyle = '#ffcc00';
            ctx.font = "bold 13px 'Courier Prime', monospace";
            ctx.fillText('!', this.x, this.y - 18);
            ctx.font = "bold 24px 'Courier Prime', monospace";
        }
        
        if (this.flashTimer > 0) color = '#ffffff';
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fillText('~', this.x, this.y);
        ctx.restore();
    }

    // 3. Null Pointer (Ø)
    function drawNullPointer(ctx) {
        ctx.save();
        
        if (this.state === 'scan' || this.state === 'cooldown') {
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 8]);
            ctx.beginPath(); ctx.moveTo(0, this.y); ctx.lineTo(800, this.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x, 0); ctx.lineTo(this.x, 600); ctx.stroke();
        } else if (this.state === 'alert') {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#ff0055';
            if (this.shootDir.x !== 0) {
                ctx.beginPath(); ctx.moveTo(0, this.y); ctx.lineTo(800, this.y); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.moveTo(this.x, 0); ctx.lineTo(this.x, 600); ctx.stroke();
            }
        }
        
        ctx.font = "bold 22px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        
        let color = '#00f2fe';
        if (this.state === 'stunned') color = '#ffff66';
        else if (this.state === 'alert') {
            color = Math.floor(Date.now() / 100) % 2 === 0 ? '#ffffff' : '#ff0055';
            
            ctx.fillStyle = '#ff0055';
            ctx.font = "bold 13px 'Courier Prime', monospace";
            ctx.fillText('!', this.x, this.y - 18);
            ctx.font = "bold 22px 'Courier Prime', monospace";
        }
        
        if (this.flashTimer > 0) color = '#ffffff';
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        
        let jx = 0, jy = 0;
        if (this.state === 'alert') {
            jx = (Math.random() - 0.5) * 4;
            jy = (Math.random() - 0.5) * 4;
        }
        
        ctx.fillText('Ø', this.x + jx, this.y + jy);
        ctx.restore();
    }

    // 4. Boss: OOM Killer
    function drawBoss(ctx) {
        ctx.save();
        
        if (this.state === 'laser_charge') {
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(this.laserX, 0);
            ctx.lineTo(this.laserX, 600);
            ctx.stroke();
        } else if (this.state === 'laser_sweep') {
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.85)';
            ctx.lineWidth = 14;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(this.laserX, 0);
            ctx.lineTo(this.laserX, 600);
            ctx.stroke();
            
            if (Math.random() < 0.35) {
                ctx.fillStyle = '#ffffff';
                ctx.font = "14px 'Courier Prime', monospace";
                ctx.fillText("!", this.laserX + (Math.random() - 0.5) * 20, Math.random() * 600);
            }
        }
        
        if (this.shockwaveRadius > 0 && this.shockwaveRadius < 250) {
            ctx.strokeStyle = `rgba(255, 0, 85, ${1 - this.shockwaveRadius / 250})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(this.x, this.y + 20, this.shockwaveRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.fallingChars) {
            ctx.font = "16px 'Courier Prime', monospace";
            ctx.fillStyle = 'rgba(0, 255, 102, 0.65)';
            this.fallingChars.forEach(char => {
                ctx.fillText(char.symbol, char.x, char.y);
            });
        }
        
        ctx.font = "bold 25px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        
        let color = '#ff0055';
        if (this.state === 'stunned') color = '#ffff66';
        else if (this.state === 'countdown') {
            color = (Math.floor(Date.now() / 90) % 2 === 0) ? '#ffffff' : '#ff0055';
        } else if (this.phase2Started) {
            const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 120);
            color = `rgba(255, 0, 85, ${pulse})`;
        }
        
        if (this.flashTimer > 0) color = '#ffffff';
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        
        const lines = [
            "[OOM]",
            "[| K |]",
            "[/ _ \\]"
        ];
        
        const rowHeight = 25;
        lines.forEach((line, index) => {
            let jx = 0, jy = 0;
            if (this.state === 'windup' || this.state === 'countdown' || this.flashTimer > 0 || this.state === 'slam_charge') {
                jx = (Math.random() - 0.5) * 6;
                jy = (Math.random() - 0.5) * 6;
            }
            ctx.fillText(line, this.x + jx, this.y + (index - 1) * rowHeight + jy + (this.yOffset || 0));
        });
        
        const barW = 140;
        const barH = 6;
        const bx = this.x - barW / 2;
        const by = this.y - 70;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(bx, by, barW, barH);
        
        const pct = Math.max(0, this.integrity / this.maxIntegrity);
        ctx.fillStyle = this.phase2Started ? '#ff0055' : '#00ff66';
        ctx.fillRect(bx, by, barW * pct, barH);
        
        ctx.strokeStyle = '#f1f3f9';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
        
        if (this.state === 'countdown') {
            ctx.fillStyle = '#ff0055';
            ctx.font = "bold 20px 'Courier Prime', monospace";
            ctx.shadowColor = '#ff0055';
            const countText = `[FAULT IN ${(this.stateTimer / 60).toFixed(1)}...]`;
            ctx.fillText(countText, this.x, this.y - 95);
            
            ctx.font = "11px 'Courier Prime', monospace";
            ctx.fillStyle = '#00f2fe';
            ctx.shadowColor = '#00f2fe';
            ctx.fillText("INTERRUPT WITH OVERFLOW (O)!", this.x, this.y - 120);
        }
        ctx.restore();
    }

    // 5. PT_Oracle NPC (Stationary tree representation)
    function drawOracle(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        
        // Green leaf crown
        ctx.fillStyle = '#00ff66';
        ctx.font = "bold 26px 'Courier Prime', monospace";
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff66';
        ctx.fillText('▲', this.x, this.y - 10);
        
        // Trunk
        ctx.fillStyle = '#cbd5e0';
        ctx.font = "bold 16px 'Courier Prime', monospace";
        ctx.fillText('||', this.x, this.y + 6);
        
        // NPC Name
        ctx.font = "bold 10px 'Courier Prime', monospace";
        ctx.fillStyle = '#00f2fe';
        ctx.fillText("PT_Oracle", this.x, this.y - 28);
        
        // Interaction guide
        if (window.Vitt) {
            const dx = window.Vitt.x - this.x;
            const dy = window.Vitt.y - this.y;
            if (dx*dx + dy*dy < 50*50 && !currentDialogue) {
                ctx.fillStyle = '#ffffff';
                ctx.fillText("[E] Hablar", this.x, this.y - 40);
            }
        }
        ctx.restore();
    }

    // 6. Bit-0 NPC (Escort)
    function drawBit0(ctx) {
        ctx.save();
        
        // Target portal
        const destX = 700, destY = 300;
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        ctx.fillStyle = 'rgba(0, 242, 254, 0.05)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(destX, destY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.font = "bold 9px 'Courier Prime', monospace";
        ctx.fillStyle = '#00f2fe';
        ctx.textAlign = 'center';
        ctx.fillText("0x0000_F8D2", destX, destY - 32);
        
        // Spikes on path
        this.spikes = this.spikes || [];
        this.spikes.forEach(spike => {
            const flash = Math.floor(Date.now() / 100) % 2 === 0;
            ctx.fillStyle = flash ? '#ff0055' : 'rgba(255, 0, 85, 0.4)';
            ctx.font = "bold 13px 'Courier Prime', monospace";
            ctx.fillText("^v^v", spike.x, spike.y);
        });
        
        // Body symbol
        ctx.font = "bold 22px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        
        let color = '#00f2fe';
        if (this.state === 'hostile_explode') color = '#ff0055';
        else if (this.isDecaying) {
            color = Math.floor(Date.now() / 150) % 2 === 0 ? '#ffcc00' : '#00f2fe';
        }
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillText(this.symbol, this.x, this.y);
        
        // Label
        ctx.font = "9px 'Courier Prime', monospace";
        ctx.fillStyle = '#cbd5e0';
        ctx.fillText("Bit-0", this.x, this.y - 28);
        
        // Voltage progress bar
        const barW = 30;
        const barH = 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(this.x - barW/2, this.y - 22, barW, barH);
        ctx.fillStyle = this.voltage < 30 ? '#ff0055' : (this.voltage < 60 ? '#ffcc00' : '#00f2fe');
        ctx.fillRect(this.x - barW/2, this.y - 22, barW * (this.voltage / 100), barH);
        
        // Charge helper
        if (window.Vitt) {
            const dx = window.Vitt.x - this.x;
            const dy = window.Vitt.y - this.y;
            if (dx*dx + dy*dy < 60*60 && this.voltage < 100 && this.state !== 'hostile_explode') {
                ctx.fillStyle = '#ffffff';
                ctx.font = "bold 9px 'Courier Prime', monospace";
                ctx.fillText("[R] Cargar", this.x, this.y - 38);
            }
        }
        ctx.restore();
    }

    // 7. Byte-0xAA NPC
    function drawByte0xAA(ctx) {
        ctx.save();
        ctx.font = "bold 20px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
        ctx.fillStyle = `rgba(0, 242, 254, ${pulse})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2fe';
        ctx.fillText("[AA]", this.x, this.y);
        
        ctx.font = "10px 'Courier Prime', monospace";
        ctx.fillStyle = '#cbd5e0';
        ctx.fillText("Byte-0xAA", this.x, this.y - 20);
        
        if (window.Vitt) {
            const dx = window.Vitt.x - this.x;
            const dy = window.Vitt.y - this.y;
            if (dx*dx + dy*dy < 50*50 && !currentDialogue && !oscilloscopeActive) {
                ctx.fillStyle = '#ffffff';
                ctx.fillText("[E] Conectar", this.x, this.y - 32);
            }
        }
        ctx.restore();
    }

    // 8. Boss: The Spindle Golem — Rework visual completo
    function drawSpindleGolem(ctx) {
        if (this.state === 'dormant') return;
        ctx.save();
        ctx.setLineDash([]);

        // ─── ARENA: Fondo dividido en 3 carriles (x > 450) ───────────────────
        const ARENA_X = 450;
        const laneColors = [
            'rgba(0,255,102,0.025)',   // carril 1
            'rgba(0,255,102,0.015)',   // carril 2
            'rgba(0,255,102,0.025)',   // carril 3
        ];
        const laneY = [50, 235, 365, 555]; // límites Y de los 3 carriles
        laneColors.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(ARENA_X, laneY[i], 800 - ARENA_X, laneY[i+1] - laneY[i]);
        });

        // Líneas divisorias de carriles
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ARENA_X, 235); ctx.lineTo(800, 235);
        ctx.moveTo(ARENA_X, 365); ctx.lineTo(800, 365);
        ctx.stroke();
        ctx.setLineDash([]);

        // Etiquetas de carril (esquina superior de cada zona)
        ctx.font = "bold 9px 'Courier Prime', monospace";
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0, 255, 102, 0.35)';
        ctx.fillText('▶ CARRIL-1 (ZONA ALTA) ', ARENA_X + 6, 70);
        ctx.fillText('▶ CARRIL-2 (ZONA MEDIA)', ARENA_X + 6, 255);
        ctx.fillText('▶ CARRIL-3 (ZONA BAJA) ', ARENA_X + 6, 385);

        // Línea vertical de separación arena
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 7]);
        ctx.beginPath(); ctx.moveTo(ARENA_X, 50); ctx.lineTo(ARENA_X, 555); ctx.stroke();
        ctx.setLineDash([]);

        // ─── INDICADORES DE ATAQUE ACTIVOS ────────────────────────────────────
        if (this.state === 'warning') {
            // Panel de alerta — desplazado hacia la fila 3 (y=56 a y=95), debajo del HUD
            const flash = Math.floor(Date.now() / 200) % 2 === 0;
            ctx.fillStyle = flash ? 'rgba(255, 0, 85, 0.18)' : 'rgba(255, 0, 85, 0.06)';
            ctx.strokeStyle = flash ? '#ff0055' : 'rgba(255,0,85,0.4)';
            ctx.lineWidth = flash ? 2 : 1;
            ctx.fillRect(ARENA_X, 50, 350, 36);
            ctx.strokeRect(ARENA_X, 50, 350, 36);

            ctx.fillStyle = '#ff0055';
            ctx.font = flash ? "bold 10px 'Courier Prime', monospace" : "10px 'Courier Prime', monospace";
            ctx.textAlign = 'center';
            ctx.shadowBlur = flash ? 8 : 0; ctx.shadowColor = '#ff0055';
            ctx.fillText('⚠ ' + this.warningMsg, ARENA_X + 175, 73);
            ctx.shadowBlur = 0;

            // Instrucción al jugador (qué hacer)
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.font = "9px 'Courier Prime', monospace";
            const hint = this.attackType === 'sweep'
                ? '¡Esquiva hacia el CARRIL LIBRE con [L] o [P]!'
                : this.attackType === 'discharge'
                ? '¡Sal del carril iluminado con [L] o [W/S]!'
                : '¡Usa [L] o [P] para estar invulnerable!  [K] para parry!';
            ctx.fillText(hint, ARENA_X + 175, 87);

            // Destello en los carriles afectados (preludio del ataque)
            const affectedLanes = this.attackType === 'sweep' ? (this.sweptLanes || [])
                : this.attackType === 'discharge' ? [this.dischargeLane]
                : [1, 2, 3];
            affectedLanes.forEach(lane => {
                const ly = lane === 1 ? 50 : lane === 2 ? 235 : 365;
                const lh = lane === 1 ? 185 : 130;
                ctx.fillStyle = flash ? 'rgba(255,0,85,0.08)' : 'rgba(255,0,85,0.03)';
                ctx.fillRect(ARENA_X, ly, 350, lh);
            });
        }

        // Barrido de cabezal — barra roja que atraviesa los carriles
        if (this.state === 'execute_sweep') {
            this.sweptLanes.forEach(lane => {
                const ly = lane === 1 ? 50 : lane === 2 ? 235 : 365;
                const lh = lane === 1 ? 185 : 130;
                // Fondo del carril barrido
                ctx.fillStyle = 'rgba(255, 0, 85, 0.22)';
                ctx.fillRect(ARENA_X, ly, 350, lh);
                // Borde
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 2;
                ctx.strokeRect(ARENA_X, ly, 350, lh);
            });

            // Cabezal: rectángulo que se desplaza de derecha a izquierda
            if (this.sweepX >= ARENA_X) {
                ctx.fillStyle = 'rgba(255, 0, 85, 0.85)';
                ctx.shadowBlur = 20; ctx.shadowColor = '#ff0055';
                ctx.fillRect(this.sweepX - 12, 50, 24, 510);
                ctx.shadowBlur = 0;

                ctx.fillStyle = '#ffffff';
                ctx.font = "bold 11px 'Courier Prime', monospace";
                ctx.textAlign = 'center';
                // Texto del cabezal
                ctx.save();
                ctx.translate(this.sweepX, 300);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText('◄◄ CABEZAL EN BARRIDO ◄◄', 0, 0);
                ctx.restore();
            }

            // Instrucción superpuesta
            ctx.fillStyle = '#ffffff';
            ctx.font = "bold 10px 'Courier Prime', monospace";
            ctx.textAlign = 'center';
            ctx.fillText('¡PELIGRO! Evita el cabezal — [L] ESQUIVA', ARENA_X + 175, 105);
        }

        // Descarga eléctrica — carril completo electrificado
        if (this.state === 'execute_discharge') {
            const laneIdx = this.dischargeLane || 1;
            const ly = laneIdx === 1 ? 50 : laneIdx === 2 ? 235 : 365;
            const lh = laneIdx === 1 ? 185 : 130;

            // Fondo del carril
            ctx.fillStyle = 'rgba(0, 242, 254, 0.12)';
            ctx.fillRect(ARENA_X, ly, 350, lh);
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 2;
            ctx.strokeRect(ARENA_X, ly, 350, lh);

            // Chispas aleatorias
            ctx.font = "14px 'Courier Prime', monospace";
            ctx.textAlign = 'left';
            for (let i = 0; i < 12; i++) {
                const sparkX = ARENA_X + 10 + Math.random() * 330;
                const sparkY = ly + 10 + Math.random() * (lh - 20);
                ctx.fillStyle = `rgba(0, 242, 254, ${0.4 + Math.random() * 0.6})`;
                ctx.shadowBlur = 6; ctx.shadowColor = '#00f2fe';
                ctx.fillText(['~', '≈', '⚡', '|'][Math.floor(Math.random()*4)], sparkX, sparkY);
            }
            ctx.shadowBlur = 0;

            // Líneas horizontales de descarga
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 4; i++) {
                const ey = ly + Math.random() * lh;
                ctx.beginPath(); ctx.moveTo(ARENA_X, ey); ctx.lineTo(800, ey); ctx.stroke();
            }

            // Instrucción
            ctx.fillStyle = '#00f2fe';
            ctx.font = "bold 10px 'Courier Prime', monospace";
            ctx.textAlign = 'center';
            ctx.fillText(`DESCARGA EN CARRIL ${laneIdx} — [W/S] SAL DEL CARRIL`, ARENA_X + 175, 105);
        }

        // Purga de voltaje — toda la arena peligrosa
        if (this.state === 'execute_purge') {
            const progress = this.stateTimer / 15;
            ctx.fillStyle = `rgba(255, 0, 85, ${progress * 0.35})`;
            ctx.fillRect(ARENA_X, 50, 350, 510);
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 2;
            ctx.strokeRect(ARENA_X, 50, 350, 510);

            // Instrucción prominente
            const flash2 = Math.floor(Date.now() / 100) % 2 === 0;
            ctx.fillStyle = flash2 ? '#ff0055' : '#ffffff';
            ctx.font = "bold 12px 'Courier Prime', monospace";
            ctx.textAlign = 'center';
            ctx.fillText('PURGA TOTAL — [K] PARA PARRY!', ARENA_X + 175, 165);
        }

        // ─── CUERPO DEL GOLEM — ASCII art detallado ──────────────────────────
        const cx = this.x;  // ~650
        const cy = this.y;  // ~290

        // Sombra del cuerpo
        let bodyColor = '#ff0055';
        if (this.state === 'staggered') bodyColor = '#ffff66';
        else if (this.state === 'warning') {
            bodyColor = Math.floor(Date.now() / 120) % 2 === 0 ? '#ffcc00' : '#ff0055';
        } else if (this.state === 'execute_sweep' || this.state === 'execute_discharge' || this.state === 'execute_purge') {
            bodyColor = '#ff0055';
        }
        if (this.flashTimer > 0) bodyColor = '#ffffff';

        const jx = (this.state === 'warning' || this.state === 'staggered' || this.flashTimer > 0)
            ? (Math.random() - 0.5) * 5 : 0;
        const jy = (this.state === 'warning' || this.state === 'staggered' || this.flashTimer > 0)
            ? (Math.random() - 0.5) * 5 : 0;

        ctx.font = "bold 13px 'Courier Prime', monospace";
        ctx.textAlign = 'center';
        ctx.fillStyle = bodyColor;
        ctx.shadowBlur = 18; ctx.shadowColor = bodyColor;

        // ASCII art del cabezal (7 líneas)
        const art = [
            '╔═════╗ ╔═════╗',
            '║ ◉  ║═╣ ◉  ║',
            '╚══╦══╝ ╚══╦══╝',
            '   ║ SPINDLE ║   ',
            '  ╔╩══════╩╗  ',
            '  ║▓▓▓▓▓▓▓▓║  ',
            '  ╚══════════╝  ',
        ];
        const lineH = 14;
        art.forEach((line, i) => {
            ctx.fillText(line, cx + jx, cy - 42 + i * lineH + jy);
        });
        ctx.shadowBlur = 0;

        // Nombre del jefe encima
        ctx.font = "bold 9px 'Courier Prime', monospace";
        ctx.fillStyle = bodyColor;
        ctx.fillText('[ GOLEM DEL CABEZAL — SPINDLE v2.3 ]', cx, cy - 60);

        // ─── BARRA DE INTEGRIDAD ──────────────────────────────────────────────
        const barW = 200;
        const barH = 8;
        const bx = cx - barW / 2;
        const by = cy + 50;
        const ratio = Math.max(0, this.integrity / this.maxIntegrity);

        // Fondo de la barra
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(bx, by, barW, barH);

        // Relleno con gradiente de color según salud
        const healthColor = ratio > 0.6 ? '#ff0055' : ratio > 0.3 ? '#ffcc00' : '#ff0055';
        ctx.fillStyle = healthColor;
        ctx.fillRect(bx, by, barW * ratio, barH);

        // Segmentos visuales en la barra
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        for (let s = 1; s < 10; s++) {
            const sx = bx + (barW / 10) * s;
            ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, by + barH); ctx.stroke();
        }

        // Borde de la barra
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);

        // Texto de la barra
        ctx.font = "bold 9px 'Courier Prime', monospace";
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('SPINDLE HP', bx, by - 4);
        ctx.textAlign = 'right';
        ctx.fillStyle = ratio < 0.3 ? '#ff0055' : 'rgba(255,255,255,0.6)';
        ctx.fillText(`${Math.round(ratio * 100)}%`, bx + barW, by - 4);

        // ─── INDICADOR DE ATURDIMIENTO ─────────────────────────────────────────
        if (this.state === 'staggered') {
            ctx.fillStyle = '#ffff66';
            ctx.font = "bold 10px 'Courier Prime', monospace";
            ctx.textAlign = 'center';
            ctx.shadowBlur = 8; ctx.shadowColor = '#ffff66';
            ctx.fillText('★ DESESTABILIZADO — 2x DAÑO — ¡ATACA AHORA! ★', cx, by + 22);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }


    // --- MODULE EXPORTS ---

    window.activeEnemies = window.activeEnemies || [];

    window.Enemies = {
        update(dt) {
            // Hook Vitt methods as soon as available
            if (window.Vitt) {
                wrapVittMethods(window.Vitt);
            }
            
            updateSlashes();
            updateProjectiles();
            updateCollectibles();
            updateFloatingTexts();
            checkSlashCollisions();
            
            // Update active enemies
            window.activeEnemies.forEach(enemy => {
                if (enemy.flashTimer > 0) enemy.flashTimer -= 1;
                enemy.update(dt);
            });
            
            // Filter out dead ones and handle item drops (elite wardens)
            const remainingEnemies = [];
            window.activeEnemies.forEach(enemy => {
                if (enemy.integrity > 0) {
                    remainingEnemies.push(enemy);
                } else {
                    if (enemy.type === 'elite' && enemy.bitLabel && enemy.bitId) {
                        window.activeCollectibles.push({
                            x: enemy.x,
                            y: enemy.y,
                            width: 25,
                            height: 25,
                            label: enemy.bitLabel,
                            id: enemy.bitId
                        });
                        spawnText(enemy.x, enemy.y, "¡BIT LIBERADO!", "#d946ef", 60);
                    }
                    
                    // Reward fragments (currency) on kills
                    window.statsKills = (window.statsKills || 0) + 1;
                    const earned = 15;
                    window.statsFragmentsCollected = (window.statsFragmentsCollected || 0) + earned;
                    if (window.Vitt && window.Vitt.fragments !== undefined) {
                        window.Vitt.fragments += earned;
                    }
                }
            });
            window.activeEnemies = remainingEnemies;
        },

        draw(ctx) {
            if (!ctx) return;
            drawSlashes(ctx);
            drawProjectiles(ctx);
            drawCollectibles(ctx);
            
            // Draw active enemies and NPCs
            window.activeEnemies.forEach(enemy => {
                enemy.draw(ctx);
            });
            
            drawFloatingTexts(ctx);
            // NOTE: Dialogue and oscilloscope are rendered in drawHUD() on the main canvas
        },

        // drawHUD — called from engine.render() AFTER compositing, on the real main canvas ctx
        // This guarantees pixel-perfect rendering on top of EVERYTHING (static walls, dynamic entities)
        drawHUD(mainCtx) {
            if (!mainCtx) return;

            // ─── CAJA DE DIÁLOGO ─────────────────────────────────────────────────
            if (currentDialogue) {
                mainCtx.save();
                mainCtx.textBaseline = 'alphabetic';

                // Panel background (solid, covers static walls completely)
                mainCtx.fillStyle = '#030508';
                mainCtx.fillRect(50, 452, 700, 116);

                // Border
                mainCtx.strokeStyle = '#00ff66';
                mainCtx.lineWidth = 2;
                mainCtx.strokeRect(50, 452, 700, 116);

                // Top accent line
                mainCtx.strokeStyle = 'rgba(0, 255, 102, 0.25)';
                mainCtx.lineWidth = 1;
                mainCtx.beginPath();
                mainCtx.moveTo(50, 476); mainCtx.lineTo(750, 476);
                mainCtx.stroke();

                // Speaker tag — left aligned
                mainCtx.fillStyle = '#00f2fe';
                mainCtx.font = "bold 11px 'Courier Prime', monospace";
                mainCtx.textAlign = 'left';
                mainCtx.fillText('> ' + currentDialogue.speaker + ':', 66, 469);

                // Dialogue text — word wrapped at 72 chars (fits in ~700px)
                mainCtx.fillStyle = '#e2e8f0';
                mainCtx.font = "12px 'Courier Prime', monospace";
                const raw = currentDialogue.lines[currentDialogue.lineIndex] || '';
                const visibleLen = Math.floor(currentDialogue.charsVisible !== undefined ? currentDialogue.charsVisible : raw.length);
                const visibleText = raw.slice(0, visibleLen);
                const wrapped = wrapText(visibleText, 72);
                wrapped.slice(0, 3).forEach((subLine, idx) => {
                    mainCtx.fillText(subLine, 66, 493 + idx * 17);
                });

                // Progress indicator + key hint — right aligned, inside panel
                const pi = `[${currentDialogue.lineIndex + 1}/${currentDialogue.lines.length}]`;
                mainCtx.fillStyle = 'rgba(140, 160, 184, 0.8)';
                mainCtx.font = "bold 9px 'Courier Prime', monospace";
                mainCtx.textAlign = 'right';
                mainCtx.fillText(pi + '  [E] continuar ►', 742, 560);

                mainCtx.restore();
            }

            // ─── OSCILÓSCOPO (minijuego de alineación) ──────────────────────────
            if (oscilloscopeActive) {
                drawOscilloscope(mainCtx);
            }
        },

        spawnDaemon(x, y) {
            const daemon = {
                x, y,
                width: 20,
                height: 20,
                integrity: 45,
                maxIntegrity: 45,
                speed: 3.8,
                type: 'daemon',
                symbol: '&',
                state: 'chase',
                stateTimer: 0,
                stunTimer: 0,
                flashTimer: 0,
                hitCooldown: 0,
                strikeDir: { x: 0, y: 0 },
                hitBySlashes: [],
                update(dt) {
                    updateDaemon.call(this, dt);
                },
                draw(ctx) {
                    drawDaemon.call(this, ctx);
                }
            };
            window.activeEnemies.push(daemon);
            return daemon;
        },

        spawnLeak(x, y) {
            const leak = {
                x, y,
                width: 24,
                height: 24,
                integrity: 120,
                maxIntegrity: 120,
                speed: 0.9,
                type: 'leak',
                symbol: '~',
                state: 'normal',
                stateTimer: 0,
                stunTimer: 0,
                flashTimer: 0,
                hitCooldown: 0,
                slimeTimer: 0,
                projectionTimer: 180,
                slimeTrail: [],
                hitBySlashes: [],
                update(dt) {
                    updateLeak.call(this, dt);
                },
                draw(ctx) {
                    drawLeak.call(this, ctx);
                }
            };
            window.activeEnemies.push(leak);
            return leak;
        },

        spawnNullPointer(x, y) {
            const sentinel = {
                x, y,
                width: 20,
                height: 20,
                integrity: 60,
                maxIntegrity: 60,
                type: 'sentinel',
                symbol: 'Ø',
                state: 'scan',
                stateTimer: 0,
                stunTimer: 0,
                flashTimer: 0,
                hitCooldown: 0,
                shootDir: { x: 0, y: 0 },
                hitBySlashes: [],
                update(dt) {
                    updateNullPointer.call(this, dt);
                },
                draw(ctx) {
                    drawNullPointer.call(this, ctx);
                }
            };
            window.activeEnemies.push(sentinel);
            return sentinel;
        },

        spawnBoss(x, y) {
            const boss = {
                x, y,
                width: 80,
                height: 80,
                integrity: 1000,
                maxIntegrity: 1000,
                speed: 0.55,
                type: 'boss',
                symbol: 'OOM',
                state: 'drift',
                stateTimer: 180,
                stunTimer: 0,
                flashTimer: 0,
                hitCooldown: 0,
                yOffset: 0,
                phase2Started: false,
                fallingChars: [],
                p2AttackTimer: 380,
                hitBySlashes: [],
                update(dt) {
                    updateBoss.call(this, dt);
                },
                draw(ctx) {
                    drawBoss.call(this, ctx);
                }
            };
            window.activeEnemies.push(boss);
            return boss;
        },

        // --- NEW MODULE ENTITIES SPAWNS ---

        spawnOracle(x, y) {
            const oracle = {
                x, y,
                width: 30,
                height: 30,
                integrity: 999999,
                maxIntegrity: 999999,
                type: 'oracle',
                symbol: '🌳',
                isNPC: true,
                interactKeyPressed: false,
                update(dt) {
                    updateOracle.call(this, dt);
                },
                draw(ctx) {
                    drawOracle.call(this, ctx);
                }
            };
            window.activeEnemies.push(oracle);
            return oracle;
        },

        spawnBit0(x, y) {
            const bit0 = {
                x, y,
                width: 20,
                height: 20,
                integrity: 999999,
                maxIntegrity: 999999,
                speed: 0.75,
                voltage: 100,
                type: 'bit0',
                symbol: '0',
                isNPC: true,
                reachedDestination: false,
                restoreKeyPressed: false,
                spikes: [],
                spikeTimer: 120,
                update(dt) {
                    updateBit0.call(this, dt);
                },
                draw(ctx) {
                    drawBit0.call(this, ctx);
                }
            };
            window.activeEnemies.push(bit0);
            return bit0;
        },

        spawnByte0xAA(x, y) {
            const byteAA = {
                x, y,
                width: 30,
                height: 30,
                integrity: 999999,
                maxIntegrity: 999999,
                type: 'byte0xAA',
                symbol: '[AA]',
                isNPC: true,
                state: 'collect_bits',
                guardiansSpawned: false,
                interactKeyPressed: false,
                update(dt) {
                    updateByte0xAA.call(this, dt);
                },
                draw(ctx) {
                    drawByte0xAA.call(this, ctx);
                }
            };
            window.activeEnemies.push(byteAA);
            window.byteAAInstance = byteAA;
            return byteAA;
        },

        spawnEliteWarden(x, y, bitLabel, bitId) {
            const warden = {
                x, y,
                width: 24,
                height: 24,
                integrity: 130,
                maxIntegrity: 130,
                speed: 2.2,
                type: 'elite',
                symbol: 'Ψ',
                bitLabel,
                bitId,
                state: 'chase',
                stateTimer: 0,
                stunTimer: 0,
                flashTimer: 0,
                hitCooldown: 0,
                strikeDir: { x: 0, y: 0 },
                hitBySlashes: [],
                update(dt) {
                    updateDaemon.call(this, dt); // Reuses chase/strike daemon core logic
                },
                draw(ctx) {
                    ctx.save();
                    ctx.font = "bold 22px 'Courier Prime', monospace";
                    ctx.textAlign = 'center';
                    
                    let color = '#d946ef'; // neon magenta
                    if (this.state === 'stunned') color = '#ffff66';
                    else if (this.state === 'windup') color = '#ffcc00';
                    else if (this.state === 'strike1' || this.state === 'strike2') color = '#ffffff';
                    
                    if (this.flashTimer > 0) color = '#ffffff';
                    
                    ctx.fillStyle = color;
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = color;
                    ctx.fillText('Ψ', this.x, this.y);
                    
                    // Draw name tag
                    ctx.font = "8px 'Courier Prime', monospace";
                    ctx.fillStyle = '#cbd5e0';
                    ctx.fillText(`Guardián ${this.bitId}`, this.x, this.y - 22);
                    
                    // Health bar
                    const barW = 32;
                    const barH = 4;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(this.x - barW/2, this.y - 18, barW, barH);
                    ctx.fillStyle = '#d946ef';
                    ctx.fillRect(this.x - barW/2, this.y - 18, barW * (this.integrity / this.maxIntegrity), barH);
                    ctx.restore();
                }
            };
            window.activeEnemies.push(warden);
            return warden;
        },

        spawnSpindleGolem(x, y) {
            const golem = {
                x, y,
                width: 120,
                height: 80,
                integrity: 1200,
                maxIntegrity: 1200,
                type: 'boss',
                symbol: 'SPINDLE',
                state: 'dormant',
                stateTimer: 120,
                stunTimer: 0,
                flashTimer: 0,
                hitCooldown: 0,
                yOffset: 0,
                sweptLanes: [],
                warningMsg: "",
                dischargeLane: 0,
                shockwaveRadius: 0,
                hitBySlashes: [],
                update(dt) {
                    updateSpindleGolem.call(this, dt);
                },
                draw(ctx) {
                    drawSpindleGolem.call(this, ctx);
                }
            };
            window.activeEnemies.push(golem);
            return golem;
        },

        resetMinigameState() {
            oscilloscopeActive = false;
            currentDialogue = null;
        },

        spawnTutorialGuide(x, y, symbol, title, lines) {
            const gridX = Math.round(x / 20);
            const gridY = Math.round(y / 20);
            const guide = {
                x: gridX * 20,
                y: gridY * 20,
                gridX, gridY,
                width: 20,
                height: 20,
                integrity: 999999,
                maxIntegrity: 999999,
                type: 'tutorial_guide',
                symbol: symbol || '?',
                title: title || 'Guia',
                lines: lines || [],
                isNPC: true,
                interactKeyPressed: false,
                update(dt) {
                    const target = window.Vitt;
                    if (!target) return;
                    if (this.dialogueCooldown === undefined) {
                        this.dialogueCooldown = 0;
                    }
                    if (this.dialogueCooldown > 0) {
                        this.dialogueCooldown -= dt * 60;
                    }
                    if (!currentDialogue && window.GameEngine && window.GameEngine.keys && window.GameEngine.keys['E']) {
                        if (!this.interactKeyPressed && this.dialogueCooldown <= 0) {
                            this.interactKeyPressed = true;
                            const dx = target.x - this.x;
                            const dy = target.y - this.y;
                            if (dx*dx + dy*dy < 45*45) {
                                currentDialogue = {
                                    speaker: this.title,
                                    lines: this.lines,
                                    lineIndex: 0,
                                    charsVisible: 0,
                                    cooldown: 20,
                                    onClose: () => {
                                        this.dialogueCooldown = 60; // 1 second delay to avoid immediate restart
                                    }
                                };
                            }
                        }
                    } else if (!window.GameEngine || !window.GameEngine.keys || !window.GameEngine.keys['E']) {
                        this.interactKeyPressed = false;
                    }
                },
                draw(ctx) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#00f2fe';
                    ctx.font = "bold 20px 'Courier Prime', monospace";
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#00f2fe';
                    ctx.fillText(this.symbol, this.x + 10, this.y + 10);
                    
                    const target = window.Vitt;
                    if (target) {
                        const dx = target.x - this.x;
                        const dy = target.y - this.y;
                        if (dx*dx + dy*dy < 40*40 && !currentDialogue) {
                            ctx.font = "8px 'Courier Prime', monospace";
                            ctx.fillStyle = '#00ff66';
                            ctx.fillText("[E] LEER", this.x + 10, this.y - 12);
                        }
                    }
                    ctx.restore();
                }
            };
            window.activeEnemies.push(guide);
            return guide;
        },

        spawnDestructibleBarrier(x, y) {
            const gridX = Math.round(x / 20);
            const gridY = Math.round(y / 20);
            const barrier = {
                x: gridX * 20,
                y: gridY * 20,
                gridX, gridY,
                width: 20,
                height: 20,
                integrity: 1,
                maxIntegrity: 1,
                type: 'barrier',
                symbol: 'C',
                isNPC: false,
                isSolid: true,
                hitCooldown: 0,
                flashTimer: 0,
                hitBySlashes: [],
                update(dt) {
                    if (this.hitCooldown > 0) this.hitCooldown -= dt * 60;
                },
                draw(ctx) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    let color = '#ff8800';
                    if (this.flashTimer > 0) color = '#ffffff';
                    ctx.fillStyle = color;
                    ctx.font = "bold 20px 'Courier Prime', monospace";
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = color;
                    ctx.fillText('C', this.x + 10, this.y + 10);
                    
                    ctx.font = "bold 8px 'Courier Prime', monospace";
                    ctx.fillStyle = '#ff8800';
                    ctx.fillText("BARRERA", this.x + 10, this.y - 12);
                    ctx.restore();
                }
            };
            window.activeEnemies.push(barrier);
            return barrier;
        },

        spawnTutorialDrone(x, y, shootInterval = 120, bulletSpeed = 3) {
            const gridX = Math.round(x / 20);
            const gridY = Math.round(y / 20);
            const drone = {
                x: gridX * 20,
                y: gridY * 20,
                gridX, gridY,
                width: 20,
                height: 20,
                integrity: 1,
                maxIntegrity: 1,
                type: 'tutorial_drone',
                symbol: 'D',
                isNPC: true,
                shootTimer: shootInterval,
                shootInterval: shootInterval,
                bulletSpeed: bulletSpeed,
                update(dt) {
                    this.shootTimer -= 1;
                    if (this.shootTimer <= 0) {
                        this.shootTimer = this.shootInterval;
                        const arrow = {
                            id: Math.random(),
                            x: this.x,
                            y: this.y + 10,
                            vx: -this.bulletSpeed,
                            vy: 0,
                            width: 10,
                            height: 8,
                            symbol: '<-',
                            owner: 'enemy',
                            damage: 5,
                            lifetime: 180
                        };
                        window.activeProjectiles.push(arrow);
                    }
                },
                draw(ctx) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#00f2fe';
                    ctx.font = "bold 20px 'Courier Prime', monospace";
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#00f2fe';
                    ctx.fillText('D', this.x + 10, this.y + 10);
                    
                    ctx.font = "8px 'Courier Prime', monospace";
                    ctx.fillStyle = '#cbd5e0';
                    ctx.fillText("Drone Pruebas", this.x + 10, this.y - 12);
                    ctx.restore();
                }
            };
            window.activeEnemies.push(drone);
            return drone;
        },

        spawnSecurityCamera(x, y, dirX = -1) {
            const gridX = Math.round(x / 20);
            const gridY = Math.round(y / 20);
            const camera = {
                x: gridX * 20,
                y: gridY * 20,
                gridX, gridY,
                width: 20,
                height: 20,
                integrity: 999999,
                maxIntegrity: 999999,
                type: 'security_camera',
                symbol: 'S',
                isNPC: true,
                shootTimer: 0,
                dirX: dirX,
                detected: false,
                update(dt) {
                    const target = window.Vitt;
                    if (!target) return;
                    
                    const myGridX = this.gridX;
                    const myGridY = this.gridY;
                    const pGridX = target.gridX;
                    const pGridY = target.gridY;
                    
                    const scanRange = 12; // Increased detection range
                    let currentlyDetected = false;
                    if (pGridY === myGridY) {
                        if (this.dirX < 0 && pGridX < myGridX && pGridX >= myGridX - scanRange) {
                            currentlyDetected = true;
                        } else if (this.dirX > 0 && pGridX > myGridX && pGridX <= myGridX + scanRange) {
                            currentlyDetected = true;
                        }
                    }
                    
                    if (currentlyDetected) {
                        if (target.isEncrypted) {
                            this.detected = false;
                        } else {
                            this.detected = true;
                            if (this.shootTimer > 0) {
                                this.shootTimer -= 1;
                            } else {
                                this.shootTimer = 15; // Shoots much faster (every 15 frames)
                                const arrow = {
                                    id: Math.random(),
                                    x: this.x,
                                    y: this.y + 10,
                                    vx: this.dirX * 8, // Bullet speed increased from 4 to 8
                                    vy: 0,
                                    width: 10,
                                    height: 8,
                                    symbol: '*',
                                    owner: 'enemy',
                                    damage: 15, // Damage increased from 10 to 15
                                    lifetime: 120
                                };
                                window.activeProjectiles.push(arrow);
                                if (window.GameAudio && typeof window.GameAudio.playAlarm === 'function') {
                                    window.GameAudio.playAlarm(0.3);
                                }
                            }
                        }
                    } else {
                        this.detected = false;
                    }
                },
                draw(ctx) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    let color = '#00ff66';
                    if (this.detected) color = '#ff0055';
                    
                    ctx.fillStyle = color;
                    ctx.font = "bold 20px 'Courier Prime', monospace";
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = color;
                    ctx.fillText('S', this.x + 10, this.y + 10);
                    
                    ctx.strokeStyle = this.detected ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 255, 102, 0.08)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(this.x + 10, this.y + 10);
                    ctx.lineTo(this.x + 10 + this.dirX * 12 * 20, this.y + 10);
                    ctx.stroke();
                    
                    ctx.font = "8px 'Courier Prime', monospace";
                    ctx.fillStyle = '#cbd5e0';
                    ctx.fillText("Cámara Seguridad", this.x + 10, this.y - 12);
                    ctx.restore();
                }
            };
            window.activeEnemies.push(camera);
            return camera;
        },

        spawnLaserGate(x, y) {
            const gridX = Math.round(x / 20);
            const gridY = Math.round(y / 20);
            const gate = {
                x: gridX * 20,
                y: gridY * 20,
                gridX, gridY,
                width: 20,
                height: 20,
                integrity: 999999,
                maxIntegrity: 999999,
                type: 'laser_gate',
                symbol: 'T',
                isNPC: true,
                disabled: false,
                flipped: false,
                get isSolid() { return !this.disabled; },
                update(dt) {
                    if (!this.disabled) {
                        const target = window.Vitt;
                        if (target && target.gridX === this.gridX && target.gridY === this.gridY) {
                            damagePlayer(15, false);
                            target.resetToSafePosition();
                        }
                    }
                },
                draw(ctx) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    if (this.disabled || this.flipped) {
                        ctx.fillStyle = '#00ff66';
                        ctx.font = "20px 'Courier Prime', monospace";
                        ctx.fillText('t', this.x + 10, this.y + 10);
                        
                        ctx.font = "8px 'Courier Prime', monospace";
                        ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
                        ctx.fillText("DESACTIVADO", this.x + 10, this.y - 12);
                    } else {
                        const pulse = Math.sin(Date.now() / 100) > 0;
                        const color = pulse ? '#ff0055' : '#ff8800';
                        ctx.fillStyle = color;
                        ctx.font = "bold 20px 'Courier Prime', monospace";
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = color;
                        ctx.fillText('T', this.x + 10, this.y + 10);
                        
                        ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(this.x + 10, this.y);
                        ctx.lineTo(this.x + 10, this.y + 20);
                        ctx.stroke();
                        
                        ctx.font = "bold 8px 'Courier Prime', monospace";
                        ctx.fillStyle = '#ff0055';
                        ctx.fillText("BARRERA LÁSER", this.x + 10, this.y - 12);
                    }
                    ctx.restore();
                }
            };
            window.activeEnemies.push(gate);
            window.activeTraps = window.activeTraps || [];
            window.activeTraps.push(gate);
            return gate;
        },

        spawnMinorCorruption(x, y) {
            const gridX = Math.round(x / 20);
            const gridY = Math.round(y / 20);
            const corruption = {
                x: gridX * 20,
                y: gridY * 20,
                gridX, gridY,
                width: 20,
                height: 20,
                integrity: 30,
                maxIntegrity: 30,
                type: 'tutorial_corruption',
                symbol: 'x',
                isNPC: false,
                flashTimer: 0,
                hitCooldown: 0,
                hitBySlashes: [],
                update(dt) {
                    if (this.hitCooldown > 0) this.hitCooldown -= dt * 60;
                    
                    const target = window.Vitt;
                    if (target) {
                        const dx = target.x - this.x;
                        const dy = target.y - this.y;
                        if (dx*dx + dy*dy < 18*18) {
                            damagePlayer(5, false);
                            target.resetToSafePosition();
                        }
                    }
                },
                draw(ctx) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    let color = '#ff0055';
                    if (this.flashTimer > 0) color = '#ffffff';
                    ctx.fillStyle = color;
                    ctx.font = "bold 20px 'Courier Prime', monospace";
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = color;
                    ctx.fillText('x', this.x + 10, this.y + 10);
                    ctx.restore();
                }
            };
            window.activeEnemies.push(corruption);
            return corruption;
        },

        spawnTutorialPortal(x, y) {
            const gridX = Math.round(x / 20);
            const gridY = Math.round(y / 20);
            const portal = {
                x: gridX * 20,
                y: gridY * 20,
                gridX, gridY,
                width: 20,
                height: 20,
                integrity: 999999,
                maxIntegrity: 999999,
                type: 'tutorial_portal',
                symbol: '@',
                isNPC: true,
                update(dt) {
                    const target = window.Vitt;
                    if (target && target.gridX === this.gridX && target.gridY === this.gridY) {
                        if (window.loadLevel) {
                            window.loadLevel(1);
                        }
                    }
                },
                draw(ctx) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const angle = (Date.now() / 200) % (Math.PI * 2);
                    ctx.fillStyle = '#00f2fe';
                    ctx.font = "bold 24px 'Courier Prime', monospace";
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = '#00f2fe';
                    
                    ctx.translate(this.x + 10, this.y + 10);
                    ctx.rotate(angle);
                    ctx.fillText('@', 0, 0);
                    ctx.restore();
                }
            };
            window.activeEnemies.push(portal);
            return portal;
        }
    };
})();
