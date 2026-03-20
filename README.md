# Saluti 3D

Sito con cubo 3D animato in movimento, struttura separata e favicon.

## Avvio
1. Apri la directory:
   ```bash
   cd /home/coder/saluti3d
   ```
2. Avvia un server locale:
   ```bash
   python3 -m http.server 8000
   ```
3. Visita: http://localhost:8000

## File
- `index.html` - markup e layout
- `css/style.css` - stili UI responsivi
- `js/app.js` - Three.js scene, cubo, animazione e controlli
- `favicon.ico` - icona

## Controlli
- Mouse/tocco: orbita
- Rotella/gesto pinch: zoom
- Drag con tasto destro: pan
- Bottoni: reset, tema, pausa
