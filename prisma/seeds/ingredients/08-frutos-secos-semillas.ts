/**
 * FRUTOS SECOS Y SEMILLAS — ~18 ingredientes
 * Macros por 100 g (sin cáscara, crudos salvo indicación).
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from '../types';

export const frutosSemillas: IngredientSeedData[] = [
  // ── FRUTOS SECOS ───────────────────────────────────────────────────────
  {
    name: 'Almendras',
    unit: 'g',
    defaultLocation: 'despensa',
    preferredUnit: 'puñado',
    variants: [
      { name: 'Crudo',    isDefault: true,  calories: 579, protein: 21.15, carbs: 21.55, fat: 49.93, fiber: 12.5 },
      { name: 'Tostadas',  isDefault: false, calories: 598, protein: 21.26, carbs: 21.83, fat: 52.54, fiber: 11.2 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
      { unitName: 'taza', gramsPerUnit: 95 },
    ],
  },
  {
    name: 'Nueces',
    unit: 'g',
    defaultLocation: 'despensa',
    preferredUnit: 'puñado',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 654, protein: 15.23, carbs: 13.71, fat: 65.21, fiber: 6.7 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
      { unitName: 'unidad (mitad)', gramsPerUnit: 5 },
    ],
  },
  {
    name: 'Avellanas',
    unit: 'g',
    defaultLocation: 'despensa',
    preferredUnit: 'puñado',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 628, protein: 14.95, carbs: 16.7, fat: 60.75, fiber: 9.7 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
    ],
  },
  {
    name: 'Anacardos',
    unit: 'g',
    defaultLocation: 'despensa',
    preferredUnit: 'puñado',
    variants: [
      { name: 'Sin sal', isDefault: true, calories: 553, protein: 18.22, carbs: 30.19, fat: 43.85, fiber: 3.3 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
    ],
  },
  {
    name: 'Pistachos',
    unit: 'g',
    defaultLocation: 'despensa',
    preferredUnit: 'puñado',
    variants: [
      { name: 'Sin sal', isDefault: true, calories: 562, protein: 20.61, carbs: 27.51, fat: 45.39, fiber: 10.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
    ],
  },
  {
    name: 'Macadamia',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 718, protein: 7.91, carbs: 13.82, fat: 75.77, fiber: 8.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
    ],
  },
  {
    name: 'Pecanas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 691, protein: 9.17, carbs: 13.86, fat: 71.97, fiber: 9.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
    ],
  },
  {
    name: 'Piñones',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 673, protein: 13.69, carbs: 13.08, fat: 68.37, fiber: 3.7 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 10 },
    ],
  },
  {
    name: 'Castañas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo',  isDefault: true,  calories: 213, protein: 2.42, carbs: 45.54, fat: 2.26, fiber: 8.1 },
      { name: 'Asadas',  isDefault: false, calories: 245, protein: 3.17, carbs: 52.96, fat: 2.2,  fiber: 5.1, weightFactor: 0.9 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 15 },
    ],
  },
  // ── SEMILLAS ───────────────────────────────────────────────────────────
  {
    name: 'Semillas de chía',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 486, protein: 16.54, carbs: 42.12, fat: 30.74, fiber: 34.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 12 },
      { unitName: 'cucharadita', gramsPerUnit: 4 },
    ],
  },
  {
    name: 'Semillas de lino',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 534, protein: 18.29, carbs: 28.88, fat: 42.16, fiber: 27.3 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 10 },
    ],
  },
  {
    name: 'Semillas de sésamo',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Tostadas', isDefault: true,  calories: 573, protein: 17.73, carbs: 23.45, fat: 49.67, fiber: 11.8 },
      { name: 'Crudo',   isDefault: false, calories: 573, protein: 17.73, carbs: 23.45, fat: 49.67, fiber: 11.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 9 },
    ],
  },
  {
    name: 'Pipas de girasol',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Sin sal', isDefault: true, calories: 584, protein: 20.78, carbs: 20.0, fat: 51.46, fiber: 8.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 9 },
    ],
  },
  {
    name: 'Semillas de calabaza',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Sin sal', isDefault: true, calories: 559, protein: 30.23, carbs: 10.71, fat: 49.05, fiber: 6.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 9 },
    ],
  },
  {
    name: 'Semillas de cáñamo',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Peladas', isDefault: true, calories: 553, protein: 31.56, carbs: 8.67, fat: 48.75, fiber: 4.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 10 },
    ],
  },
  {
    name: 'Tahini',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Pasta de sésamo', isDefault: true, calories: 595, protein: 17.0, carbs: 21.2, fat: 53.8, fiber: 9.3 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 15 },
    ],
  },
  {
    name: 'Coco rallado',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Desecado sin azúcar', isDefault: true, calories: 660, protein: 6.88, carbs: 23.65, fat: 64.53, fiber: 16.3 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 5 },
    ],
  },
  {
    name: 'Almendras laminadas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 579, protein: 21.15, carbs: 21.55, fat: 49.93, fiber: 12.5 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 7 },
    ],
  },
];
