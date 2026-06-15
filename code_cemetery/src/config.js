/**
 * ARCHIVO DE CONFIGURACIÓN DEL JUEGO — Code_Cemetery
 * Puedes editar este archivo para personalizar los iconos, colores, textos de daño, etc.
 */
window.GameConfig = {
    // Configuración del texto flotante (Damage popups y alertas)
    floatingText: {
        // Color del daño que Vitt (el jugador) inflige a los enemigos
        playerDamageDealtColor: '#ffd736', // Amarillo llamativo como se solicitó
        
        // Color del daño que recibe Vitt
        playerDamageTakenColor: '#ff0019', // Rojo neón
        
        // Color del texto de bloqueo e interrupciones
        parryColor: '#36df6e',
        blockColor: '#cbd5e0',
        itemPickupColor: '#00f2fe',
        
        // Tamaño de letra y estilo para los números de daño y textos flotantes
        font: 'bold 20px "Courier Prime", monospace',
        
        // Duración en frames del texto flotante en pantalla
        duration: 20
    },

    // Símbolos (caracteres ASCII) de los enemigos e interactivos del juego
    enemySymbols: {
        daemon: '☣',          // Daemon Thread
        leak: '⌬',            // Memory Leak
        nullPointer: 'Ø',     // Null Pointer
        drone: '𖥂',           // Drone de pruebas en el tutorial
        guideNPC: '?',        // NPC de ayuda (?)
        interactiveNPC: 'i',  // NPC de conexión/portales (i)
        boss: 'B'             // Jefe principal (OOM Killer / Golems)
    },

    // Colores base de los enemigos y NPCs en el canvas
    enemyColors: {
        daemon: '#ff0055',        // Rojo neón
        leak: '#00ff66',          // Verde neón
        nullPointer: '#00f2fe',   // Celeste/Cian neón
        drone: '#00f2fe',         // Celeste/Cian neón
        guideNPC: '#00f2fe',      // Celeste/Cian neón
        interactiveNPC: '#00f2fe' // Celeste/Cian neón
    },

    // Parámetros de gameplay ajustables
    gameplay: {
        baseSlashDamage: 15,       // Daño base del ataque del jugador (J)
        staggerMultiplier: 2.0     // Multiplicador de daño cuando el enemigo está aturdido (staggered)
    }
};
