# Code_Cemetery: Vitt's Journey

> **Soulslike de terminal ASCII en el navegador**  
> Un puntero de 64-bits contra la corrupción del sistema

---

## 🎮 Jugarlo ahora

### Opción A — Sin servidor (la más simple)

1. Descargá o cloná este repositorio.
2. Hacé **doble clic** en `index.html`.
3. Se abre en tu navegador (Chrome, Edge o Firefox).  
   **No necesita instalación, servidor ni dependencias.**

> **Funciona en Windows, Linux y macOS.** Es puro HTML5 + JavaScript de navegador estándar.

### Opción B — Servidor local (recomendado si Chrome bloquea archivos locales)

```bash
# Python 3 (viene preinstalado en Linux/macOS)
python3 -m http.server 8000
# Luego abrí: http://localhost:8000/

# Node.js (Windows/Linux/macOS)
npx serve .
# Luego abrí la URL que muestre en consola
```

---

## 🕹️ Controles

| Tecla | Acción |
|-------|--------|
| `W A S D` | Mover a Vitt (`&`) |
| `J` | Logic-Slash (ataque cuerpo a cuerpo) |
| `K` | Parry / Bloqueo |
| `L` | Hex-Dodge (esquiva + invulnerabilidad) |
| `U` | Cifrado (sigilo, consume CPU/seg) |
| `I` | Bitflip (invierte proyectiles / aturde enemigos) |
| `O` | Overflow (blast radial, gasta toda la CPU) |
| `P` | Cache Prefetch (teleporte 6 celdas, invulnerable en trayecto) |
| `E` | Interactuar / Avanzar diálogo |
| `G` | Alternar Modo Dios (sandbox) |
| `1-4` | Invocar enemigos (sandbox) |

---

## 📁 Estructura del proyecto

```
code_cemetery/
├── index.html          ← Punto de entrada, menús, integración
└── src/
    ├── audio.js        ← Síntesis de audio procedural (Web Audio API)
    ├── engine.js       ← Motor: grid ASCII, loop, partículas, input
    ├── vitt.js         ← Jugador: movimiento, habilidades, HUD
    └── enemies.js      ← Enemigos, NPCs, jefe Spindle Golem, diálogos
```

---

## 🖥️ ¿Es compatible con Windows?

**Sí, 100%.** El juego no tiene ninguna dependencia de backend, servidor ni sistema operativo. Usa exclusivamente:

- **HTML5 Canvas** — estándar de todos los navegadores modernos
- **Vanilla JavaScript** — sin frameworks ni librerías externas
- **Web Audio API** — sintetizador de audio nativo del navegador
- **CSS3** — estilos puros

Solo necesitás tener Chrome, Firefox o Edge instalado (que ya viene en Windows).

---

## 🔧 Subir a Git y GitHub

### 1. Inicializar el repositorio local

```bash
cd /ruta/al/proyecto/code_cemetery
git init
git add .
git commit -m "feat: Code_Cemetery v1.0.6 — Nivel 1 SWAP Space"
```

### 2. Crear el repositorio en GitHub

1. Ir a [github.com](https://github.com) → **New repository**
2. Nombre: `code-cemetery`
3. Dejalo en **Public** (para poder usar GitHub Pages gratis)
4. **NO** marques "Initialize this repository" (ya lo hicimos localmente)
5. Click en **Create repository**

### 3. Conectar y subir

```bash
# Reemplazá TU_USUARIO con tu nombre de usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/code-cemetery.git
git branch -M main
git push -u origin main
```

### 4. Actualizaciones futuras

```bash
git add .
git commit -m "fix: descripción del cambio"
git push
```

---

## 🌐 Publicar en GitHub Pages (link web gratuito)

Una vez que el código esté en GitHub:

1. Ir al repositorio → **Settings** (pestaña)
2. En el menú izquierdo → **Pages**
3. Bajo **Source** → seleccionar **Deploy from a branch**
4. Rama: `main` | Carpeta: `/ (root)`
5. Click en **Save**

En 1–2 minutos, el juego estará disponible en:

```
https://TU_USUARIO.github.io/code-cemetery/
```

¡Compartí ese link con cualquiera y podrán jugarlo desde el navegador sin instalar nada!

---

## 🎨 Perfiles gráficos

| Perfil | Efectos activos |
|--------|----------------|
| **High** | CRT scanlines, aberración cromática, vibración de pantalla, partículas |
| **Low**  | Sin efectos visuales complejos — máximo rendimiento |

---

## 📖 Lore

*El sistema sufre una **Muerte Térmica** catastrófica. Los ventiladores fallaron, el silicio se derretiría y el voltaje decae libremente.*

*Controlás a **Vitt** (`&`), un puntero huérfano de 64-bits. Tu misión es transportar el código de apagado seguro (**Interrupt 0x00 / SIGTERM**) desde el sector de memoria RAM hasta la ALU de ejecución antes del colapso eléctrico del bus central.*

---

## ⚖️ Licencia

MIT — Libre de usar, modificar y distribuir.
