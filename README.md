# BETS Roulette - Lucky Spin 🎰

A beautiful roulette wheel game built from Figma design using HTML, CSS, and JavaScript.

## Features

- **Responsive Design** - Scales to fit different screen sizes
- **Smooth Animations** - Realistic spinning wheel with easing
- **Probability-Based** - Configurable prize probabilities
- **Interactive UI** - Hover effects and visual feedback
- **Keyboard Support** - Press SPACE to spin

## Files Generated from Figma

- `figma_design_data.json` - Complete design data from Figma API
- `figma_extracted_data.json` - Extracted colors, text styles, and components
- `layout.css` - Generated CSS layout with exact positioning
- `exports/` - All design assets exported as PNG images

## Project Structure

```
wheel_rollem/
├── index.html              # Main HTML structure
├── style.css               # Complete styling
├── script.js               # Roulette logic and animations
├── exports/                # Design assets from Figma
│   ├── Wheel.png
│   ├── BETS_Logo_1.png
│   ├── bg_1.png
│   ├── List.png
│   └── ... (all exported images)
├── fetch_figma_design.py   # Script to fetch design from Figma
├── export_assets.py        # Script to export images and generate CSS
├── analyze_design.py       # Script to analyze design structure
└── layout.css              # Generated layout from Figma
```

## How to Run

1. Open `index.html` in a web browser
2. Click the **SPIN** button or press **SPACE** to spin the wheel
3. Wait for the result!

## Customization

### Modify Prize Probabilities

Edit `script.js` and update the `prizes` array:

```javascript
const prizes = [
    { name: "Grand Prize", probability: 0.05 },    // 5% chance
    { name: "Second Prize", probability: 0.10 },   // 10% chance
    // ... add or modify prizes
];
```

### Change Spin Duration

In `script.js`, modify the `duration` variable:

```javascript
const duration = 5000; // milliseconds (5 seconds)
```

### Adjust Wheel Speed

In `script.js`, change the number of spins:

```javascript
const spins = 5; // Number of full rotations before landing
```

## Design Source

Original design: [Figma - BETS Roulette](https://www.figma.com/design/umLng8LozH8lWdqmAtpLed/BETS-Roulette?node-id=0-3)

## Technologies Used

- HTML5
- CSS3 (Flexbox, Grid, Animations)
- Vanilla JavaScript (ES6+)
- Figma API (for design extraction)
- Python (for automation scripts)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Scripts

### Fetch Design from Figma
```bash
py fetch_figma_design.py
```

### Export Assets
```bash
py export_assets.py
```

### Analyze Design Structure
```bash
py analyze_design.py
```

## Color Palette (from Figma)

- Background: `#000000`
- Gray: `#d9d9d9`
- White: `#ffffff`
- Gold: `#FFD700` (accent)
- Orange: `#FFA500` (button gradient)

## License

This project was created for demonstration purposes.

---

**Enjoy spinning! 🎲**
