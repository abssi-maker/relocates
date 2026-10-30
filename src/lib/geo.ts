const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function decodeGeohash(g: string) {
  let even = true;
  const lat = [-90, 90], lon = [-180, 180];
  for (const ch of g) {
    const cd = B32.indexOf(ch);
    for (let mask = 16; mask; mask >>= 1) {
      const range = even ? lon : lat;
      const mid = (range[0] + range[1]) / 2;
      if (cd & mask) range[0] = mid;
      else range[1] = mid;
      even = !even;
    }
  }
  return { s: lat[0], w: lon[0], n: lat[1], e: lon[1] };
}
