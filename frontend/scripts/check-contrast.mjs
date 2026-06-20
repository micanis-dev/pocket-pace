const luminance = (hex) => {
  const channels = hex.match(/../g).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrast = (foreground, background) => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

const pairs = [
  ['light text', '1d1d1f', 'ffffff', 4.5],
  ['light muted text', '5f6368', 'ffffff', 4.5],
  ['light link', '0066cc', 'ffffff', 4.5],
  ['light input boundary', '6e6e73', 'ffffff', 3],
  ['dark text', 'f5f5f7', '232428', 4.5],
  ['dark muted text', 'b0b0b5', '232428', 4.5],
  ['dark link', '64a8ff', '232428', 4.5],
  ['dark input boundary', '8e8e93', '232428', 3],
  ['green action', 'ffffff', '007a33', 4.5],
  ['rose action', 'ffffff', 'c7003d', 4.5],
  ['orange action', 'ffffff', 'a64000', 4.5],
];

const failures = [];
for (const [name, foreground, background, minimum] of pairs) {
  const ratio = contrast(foreground, background);
  console.log(`${name}: ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)`);
  if (ratio < minimum) failures.push(name);
}

if (failures.length) {
  console.error(`Contrast check failed: ${failures.join(', ')}`);
  process.exit(1);
}
