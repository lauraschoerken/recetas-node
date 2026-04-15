/**
 * LEGUMBRES — ~15 ingredientes
 * Macros en seco por 100 g + variante cocida con weightFactor.
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from '../types';

export const legumbres: IngredientSeedData[] = [
  {
    name: 'Lentejas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secas',   isDefault: true,  calories: 352, protein: 25.8,  carbs: 60.08, fat: 1.06, fiber: 10.7 },
      { name: 'Cocidas', isDefault: false, calories: 116, protein: 9.02,  carbs: 20.13, fat: 0.38, fiber: 7.9, weightFactor: 2.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'taza', gramsPerUnit: 190 },
      { unitName: 'puñado', gramsPerUnit: 70 },
    ],
  },
  {
    name: 'Garbanzos',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secos',   isDefault: true,  calories: 364, protein: 19.3,  carbs: 60.65, fat: 6.04, fiber: 17.4 },
      { name: 'Cocidos', isDefault: false, calories: 164, protein: 8.86,  carbs: 27.42, fat: 2.59, fiber: 7.6, weightFactor: 2.5 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'bote', gramsPerUnit: 240 }, // peso escurrido bote 400g
      { unitName: 'taza', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Alubias blancas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secas',   isDefault: true,  calories: 337, protein: 23.36, carbs: 60.27, fat: 0.85, fiber: 15.2 },
      { name: 'Cocidas', isDefault: false, calories: 139, protein: 9.73,  carbs: 25.09, fat: 0.35, fiber: 6.3, weightFactor: 2.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'bote', gramsPerUnit: 240 },
    ],
  },
  {
    name: 'Alubias negras',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secas',   isDefault: true,  calories: 339, protein: 21.6,  carbs: 62.36, fat: 1.42, fiber: 15.5 },
      { name: 'Cocidas', isDefault: false, calories: 132, protein: 8.86,  carbs: 23.71, fat: 0.54, fiber: 8.7, weightFactor: 2.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'bote', gramsPerUnit: 240 },
    ],
  },
  {
    name: 'Alubias rojas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secas',   isDefault: true,  calories: 333, protein: 23.58, carbs: 60.01, fat: 0.83, fiber: 15.2 },
      { name: 'Cocidas', isDefault: false, calories: 127, protein: 8.67,  carbs: 22.8,  fat: 0.5,  fiber: 6.4, weightFactor: 2.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'bote', gramsPerUnit: 240 },
    ],
  },
  {
    name: 'Habas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secas',   isDefault: true,  calories: 341, protein: 26.12, carbs: 58.29, fat: 1.53, fiber: 25.0 },
      { name: 'Cocidas', isDefault: false, calories: 110, protein: 7.92,  carbs: 19.65, fat: 0.4,  fiber: 5.4, weightFactor: 2.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Guisantes secos',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secos',   isDefault: true,  calories: 339, protein: 23.82, carbs: 60.37, fat: 1.16, fiber: 26.0 },
      { name: 'Cocidos', isDefault: false, calories: 118, protein: 8.34,  carbs: 21.09, fat: 0.39, fiber: 8.3, weightFactor: 2.3 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Soja',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Seca', isDefault: true,  calories: 446, protein: 36.49, carbs: 30.16, fat: 19.94, fiber: 9.3 },
      { name: 'Cocida', isDefault: false, calories: 173, protein: 16.64, carbs: 9.93, fat: 8.97, fiber: 6.0, weightFactor: 2.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Tofu',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Firme', isDefault: true,  calories: 76,  protein: 8.08, carbs: 1.88, fat: 4.17, fiber: 0.3 },
      { name: 'Sedoso', isDefault: false, calories: 55, protein: 5.3,  carbs: 2.3,  fat: 2.7,  fiber: 0.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'bloque', gramsPerUnit: 400 },
    ],
  },
  {
    name: 'Tempeh',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Natural', isDefault: true, calories: 193, protein: 18.54, carbs: 9.39, fat: 10.8, fiber: 2.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'bloque', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Edamame',
    unit: 'g',
    defaultLocation: 'congelador',
    variants: [
      { name: 'Congelado (sin vaina)', isDefault: true, calories: 121, protein: 11.91, carbs: 8.91, fat: 5.2, fiber: 5.2 },
      { name: 'Cocido', isDefault: false, calories: 121, protein: 11.91, carbs: 8.91, fat: 5.2, fiber: 5.2, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Cacahuetes',
    unit: 'g',
    defaultLocation: 'despensa',
    preferredUnit: 'puñado',
    variants: [
      { name: 'Tostados sin sal', isDefault: true, calories: 567, protein: 25.8, carbs: 16.13, fat: 49.24, fiber: 8.5 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'puñado', gramsPerUnit: 28 },
    ],
  },
  {
    name: 'Mantequilla de cacahuete',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Natural sin azúcar', isDefault: true, calories: 588, protein: 25.09, carbs: 20.0, fat: 49.94, fiber: 6.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 32 },
    ],
  },
  {
    name: 'Hummus',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Comercial', isDefault: true, calories: 177, protein: 4.86, carbs: 14.29, fat: 9.6, fiber: 6.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 30 },
      { unitName: 'ración', gramsPerUnit: 80 },
    ],
  },
  {
    name: 'Lentejas rojas',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Secas',   isDefault: true,  calories: 358, protein: 25.0, carbs: 62.0, fat: 1.1, fiber: 11.0 },
      { name: 'Cocidas', isDefault: false, calories: 127, protein: 9.0,  carbs: 21.9, fat: 0.4, fiber: 4.8, weightFactor: 2.2 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
];
