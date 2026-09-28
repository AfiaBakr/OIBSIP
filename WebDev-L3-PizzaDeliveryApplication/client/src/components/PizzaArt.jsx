// A small SVG pizza drawn from the chosen ingredients, so the builder shows the pizza taking shape.

const SAUCE_COLORS = { tomato: '#d9480f', pesto: '#5c940d', alfredo: '#f8f0e3', bbq: '#7f2704', arrabbiata: '#c92a2a' };
const CHEESE_COLORS = { mozzarella: '#fff3bf', cheddar: '#ffc078', parmesan: '#ffe8a1', vegan: '#fff9db' };
const VEG_COLORS = {
  onion: '#b197fc',
  capsicum: '#40c057',
  tomato: '#fa5252',
  mushroom: '#a9927d',
  corn: '#fcc419',
  olive: '#343a40',
  jalape: '#2b8a3e',
  spinach: '#37b24d',
  paneer: '#fffaf0',
  paprika: '#e03131',
};

const match = (map, name, fallback) => {
  const lower = (name || '').toLowerCase();
  const key = Object.keys(map).find((k) => lower.includes(k));
  return key ? map[key] : fallback;
};

// Deterministic scatter so toppings don't jump around on every render.
function toppingPositions(seed, count) {
  const points = [];
  let s = seed;
  for (let i = 0; i < count; i += 1) {
    s = (s * 9301 + 49297) % 233280;
    const angle = (s / 233280) * Math.PI * 2;
    s = (s * 9301 + 49297) % 233280;
    const radius = 12 + (s / 233280) * 50;
    points.push([100 + Math.cos(angle) * radius, 100 + Math.sin(angle) * radius]);
  }
  return points;
}

export default function PizzaArt({ base, sauce, cheese, veggies = [], size = 180 }) {
  const crust = base ? (base.name.includes('Wheat') ? '#b0793a' : base.name.includes('Thin') ? '#e0a95c' : '#d99a4e') : '#e9ecef';
  const sauceColor = sauce ? match(SAUCE_COLORS, sauce.name, '#d9480f') : null;
  const cheeseColor = cheese ? match(CHEESE_COLORS, cheese.name, '#fff3bf') : null;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Pizza preview" className="pizza-art">
      <circle cx="100" cy="100" r="92" fill={crust} />
      {base?.name.includes('Cheese Burst') && <circle cx="100" cy="100" r="88" fill="none" stroke="#ffe066" strokeWidth="5" />}
      {!base && <circle cx="100" cy="100" r="92" fill="none" stroke="#ced4da" strokeWidth="3" strokeDasharray="8 8" />}
      {sauceColor && <circle cx="100" cy="100" r="80" fill={sauceColor} />}
      {cheeseColor && (
        <g fill={cheeseColor} opacity="0.92">
          <circle cx="100" cy="100" r="72" />
          <circle cx="60" cy="70" r="16" />
          <circle cx="140" cy="130" r="14" />
        </g>
      )}
      {veggies.map((veg, vi) =>
        toppingPositions(vi * 97 + 13, 6).map(([x, y], i) => (
          <circle
            key={`${veg._id}-${i}`}
            cx={x}
            cy={y}
            r={veg.name.includes('Olive') ? 5 : 6}
            fill={match(VEG_COLORS, veg.name, '#51cf66')}
            stroke="rgba(0,0,0,0.15)"
          />
        ))
      )}
    </svg>
  );
}
