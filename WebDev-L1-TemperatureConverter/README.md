# Temperature Converter

An interactive web tool that converts a temperature value between Celsius, Fahrenheit, and Kelvin, with real-time input validation. Built as part of the Oasis Infobyte Web Development Internship (Level 1).

## Features

- Numeric input field for the temperature value, with validation that rejects non-numeric input and shows an inline error message.
- Unit selector (radio buttons) to choose the input unit — Celsius, Fahrenheit, or Kelvin.
- Auto-conversion: all three units (°C, °F, K) are displayed simultaneously after conversion, with the input unit highlighted.
- **Convert** button that triggers the calculation on click.
- Result display area showing converted values with correct unit labels.
- Absolute zero validation: displays a friendly warning if the entered value is below −273.15 °C (−459.67 °F / 0 K), instead of showing a physically impossible result.
- Clean, centered card layout with clear labels, built to work on mobile and desktop.

## Conversion Formulas

- Celsius → Fahrenheit: `F = C × 9/5 + 32`
- Fahrenheit → Celsius: `C = (F − 32) × 5/9`
- Celsius → Kelvin: `K = C + 273.15`
- Kelvin → Celsius: `C = K − 273.15`

All conversions are computed by first normalizing the entered value to Celsius, then deriving Fahrenheit and Kelvin from it.

## Tech Stack

- HTML5
- CSS3 (custom styles, no framework)
- Vanilla JavaScript

## File Structure

```
WebDev-L1-TemperatureConverter/
├── index.html   # Page markup — input, unit selector, results
├── style.css    # Styling and responsive layout
├── script.js    # Validation, conversion logic, absolute zero handling
└── README.md
```

## Running Locally

No build step is required. Simply open `index.html` in a web browser, or serve the folder with a local static server, e.g.:

```bash
npx serve .
```

## Author

Afia Bakr
