# Solid of Revolution Visualizer

This web application lets you visualize the solid formed by revolving a function around the x-axis. Built with Three.js and JavaScript, it features dynamic rotation control and real-time function editing.

## Features

- 3D mesh rendering of solids of revolution
- Adjustable angle of revolution via slider
- Live function input using JavaScript syntax
- Grid and axis helpers for orientation
- Real-time red curve display of the function in the XY-plane

## Usage

1. Open the application in a browser.
2. Use the text input at the top left to define your function, e.g.:  
`Math.sin(x)`  
`Math.pow(x, 2)`  
`Math.exp(-x * x)`  
3. Drag the angle slider to control how much of the solid is revolved.
4. Use mouse to orbit, pan, and zoom with OrbitControls.

## Syntax Rules

- Functions must be valid JavaScript expressions.
- Use `Math.` functions (e.g., `Math.sin`, `Math.pow`).
- Use `x` as the variable.
- Do not use `^` for exponentiation; use `Math.pow(x, n)` or `x ** n`.

## Dependencies

- Three.js
- OrbitControls (from Three.js examples)

## Setup

No build tools required. Include the script via a bundler or serve the HTML file with a local web server. Ensure Three.js and its modules are correctly imported.

## TODO

- Dynamic planes for zooming
- Dynamic step counts by zoom
- Add support for rotating around the y-axis and arbitrary lines
- Display symbolic and numeric volume computation
- Add tick marks and axis labels
- Improve error handling for invalid function input
- Add support for parametric or polar functions
- Implement export (3d obj) or screenshot functionality
