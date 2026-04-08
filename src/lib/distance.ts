// src/lib/distance.ts
/**
 * HAVERSINE FORMULA
 * =================
 * Calculates the great-circle distance between two points on Earth
 * 
 * Algorithm Type: Geospatial distance calculation
 * Time Complexity: O(1) - constant time
 * Used for: Calculating straight-line distance from user to stations
 */

export function calculateDistanceKm(
  lat1: number, // user's latitude
  lng1: number, // user's longitude
  lat2: number, // stations latitude 
  lng2: number // stations longitude
): number {
  const R = 6371; // Earths radius in kilometers

  // Convert degrees to radians
  // Formula Breakdown:
  // hav(θ) = sin²(θ/2)

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  // Haversine formula
  // Step 1: Calculate the components of the formula
  const a =
    // Latitude difference squared
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +

    // Step 2: Calculate the distance using the components
    Math.cos((lat1 * Math.PI) / 180) *
    // Step 3: Calculate the distance using the components
      Math.cos((lat2 * Math.PI) / 180) *
      // Step 4: Calculate the distance using the components
      Math.sin(dLng / 2) *
      // Step 5: Calculate the distance using the components
      Math.sin(dLng / 2);

  // Step 6: Final distance calculation
  // Convert the haversine back to an angular distance
  // Formula: c = 2 × arctan2(√a, √(1-a))
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Step 7: Return the distance in kilometers
  // Formula: distance = radius × angle
  // - c is the angle in radians
  // - R is Earth's radius in km
  // - Result is distance in km
  return R * c;
}
