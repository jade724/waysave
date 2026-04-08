/// <reference types="@types/google.maps" />

// Ensure the google namespace exists globally
declare global {
  const google: typeof import("google.maps");
}

export {};
