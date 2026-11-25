"use client";

import { useServiceStatus } from "./useServiceStatus";

/**
 * Invisible: en la portada despierta los servicios de Render mientras el
 * usuario inicia sesión, así el panel ya los encuentra activos.
 */
export default function WakeServices() {
  useServiceStatus();
  return null;
}
