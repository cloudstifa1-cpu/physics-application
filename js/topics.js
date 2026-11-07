// Home screen topics and the aspects inside each one.
// Shown in alphabetical order; an aspect opens its animation (scene).
const TOPICS = [
  { name: 'Optics', blurb: 'How light bends, reflects and focuses', aspects: [
    { name: 'Curved mirrors', scene: 'mirror', eq: 'f = R / 2' },
    { name: "Refraction (Snell's law)", scene: 'snell', eq: 'n1 sin θ1 = n2 sin θ2' },
    { name: 'Thin lenses', scene: 'lens', eq: '1/f = 1/do + 1/di' },
  ] },
  { name: 'Quantum physics', blurb: 'Waves, particles and uncertainty', aspects: [] },
  { name: 'Relativity', blurb: 'Space, time, gravity and energy at extreme speeds and masses', aspects: [
    { name: 'Gravity and spacetime curvature', scene: 'gravity', eq: 'rₛ = 2GM/c²' },
    { name: 'Mass–energy (E = mc²)', scene: 'energy', eq: 'E = mc²' },
    { name: 'Time dilation and length contraction', scene: 'spacetime', eq: 'Δt = γΔt₀' },
    { name: 'Velocity addition', scene: 'veladd', eq: 'w = (u + v) / (1 + uv/c²)' },
  ] },
  { name: 'Thermodynamics', blurb: 'Heat, temperature, pressure and energy', aspects: [
    { name: 'First law (ΔU = Q − W)', scene: 'firstlaw', eq: 'ΔU = Q − W' },
    { name: 'Ideal gas (PV = nRT)', scene: 'gas', eq: 'PV = nRT' },
    { name: 'Specific heat (Q = mcΔT)', scene: 'heat', eq: 'Q = mcΔT' },
  ] },
];
const byName = list => [...list].sort((a, b) => a.name.localeCompare(b.name));
function findAspect(sceneId) {
  for (const t of TOPICS) for (const a of t.aspects) if (a.scene === sceneId) return [t, a];
  return [null, null];
}
