import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une clases condicionales y resuelve conflictos de Tailwind: en
 * `cn("px-4", "px-2")` gana `px-2`, así un `className` externo siempre
 * puede sobrescribir los estilos base de un componente.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
