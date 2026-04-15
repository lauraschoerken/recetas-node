/**
 * VERDURAS Y HORTALIZAS — ~55 ingredientes
 * Macros por 100 g en crudo, salvo indicación.
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from '../types';

export const verduras: IngredientSeedData[] = [
  {
    name: 'Zanahoria',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 41, protein: 0.93, carbs: 9.58, fat: 0.24, fiber: 2.8 },
      { name: 'Cocida', isDefault: false, calories: 35, protein: 0.76, carbs: 8.22, fat: 0.18, fiber: 3.0, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 75 },
    ],
  },
  {
    name: 'Patata',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 77, protein: 2.05, carbs: 17.49, fat: 0.09, fiber: 2.2 },
      { name: 'Hervida', isDefault: false, calories: 87, protein: 1.71, carbs: 20.13, fat: 0.1, fiber: 1.8, weightFactor: 1.0 },
      { name: 'Asada', isDefault: false, calories: 93, protein: 2.5, carbs: 21.15, fat: 0.1, fiber: 2.1, weightFactor: 0.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 150 },
    ],
  },
  {
    name: 'Puerro',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 61, protein: 1.5, carbs: 14.15, fat: 0.3, fiber: 1.8 },
      { name: 'Cocinado', isDefault: false, calories: 31, protein: 0.81, carbs: 7.62, fat: 0.16, fiber: 1.6, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 90 },
    ],
  },
  {
    name: 'Cebolla',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 40, protein: 1.1, carbs: 9.34, fat: 0.1, fiber: 1.7 },
      { name: 'Pochada', isDefault: false, calories: 44, protein: 1.36, carbs: 10.44, fat: 0.19, fiber: 1.3, weightFactor: 0.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 130 },
    ],
  },
  {
    name: 'Ajo',
    unit: 'g',
    defaultLocation: 'despensa',
    preferredUnit: 'diente',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 149, protein: 6.36, carbs: 33.06, fat: 0.5, fiber: 2.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'diente', gramsPerUnit: 4 },
      { unitName: 'cabeza', gramsPerUnit: 40 },
    ],
  },
  {
    name: 'Tomate',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 18, protein: 0.88, carbs: 3.89, fat: 0.2, fiber: 1.2 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 120 },
    ],
  },
  {
    name: 'Tomate cherry',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 18, protein: 0.88, carbs: 3.89, fat: 0.2, fiber: 1.2 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 10 },
    ],
  },
  {
    name: 'Pimiento rojo',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 31, protein: 0.99, carbs: 6.03, fat: 0.3, fiber: 2.1 },
      { name: 'Asado', isDefault: false, calories: 28, protein: 1.0, carbs: 6.0, fat: 0.25, fiber: 1.9, weightFactor: 0.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 150 },
    ],
  },
  {
    name: 'Pimiento verde',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 20, protein: 0.86, carbs: 4.64, fat: 0.17, fiber: 1.7 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 150 },
    ],
  },
  {
    name: 'Pimiento amarillo',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 27, protein: 1.0, carbs: 6.32, fat: 0.21, fiber: 0.9 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 150 },
    ],
  },
  {
    name: 'Brócoli',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 34, protein: 2.82, carbs: 6.64, fat: 0.37, fiber: 2.6 },
      { name: 'Cocido', isDefault: false, calories: 35, protein: 2.38, carbs: 7.18, fat: 0.41, fiber: 3.3, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cabeza', gramsPerUnit: 500 },
    ],
  },
  {
    name: 'Coliflor',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 25, protein: 1.9, carbs: 5.0, fat: 0.28, fiber: 2.0 },
      { name: 'Cocida', isDefault: false, calories: 23, protein: 1.84, carbs: 4.11, fat: 0.45, fiber: 2.3, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cabeza', gramsPerUnit: 600 },
    ],
  },
  {
    name: 'Espinacas',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 23, protein: 2.86, carbs: 3.63, fat: 0.39, fiber: 2.2 },
      { name: 'Cocidas', isDefault: false, calories: 23, protein: 2.97, carbs: 3.75, fat: 0.26, fiber: 2.4, weightFactor: 0.9 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'manojo', gramsPerUnit: 150 },
    ],
  },
  {
    name: 'Lechuga romana',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 17, protein: 1.23, carbs: 3.29, fat: 0.3, fiber: 2.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 350 },
    ],
  },
  {
    name: 'Lechuga iceberg',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 14, protein: 0.9, carbs: 2.97, fat: 0.14, fiber: 1.2 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 400 },
    ],
  },
  {
    name: 'Calabaza',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 26, protein: 1.0, carbs: 6.5, fat: 0.1, fiber: 0.5 },
      { name: 'Asada', isDefault: false, calories: 20, protein: 0.72, carbs: 4.9, fat: 0.07, fiber: 0.5, weightFactor: 0.85 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Calabacín',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 17, protein: 1.21, carbs: 3.11, fat: 0.32, fiber: 1.0 },
      { name: 'Cocinado', isDefault: false, calories: 17, protein: 1.14, carbs: 3.57, fat: 0.41, fiber: 1.2, weightFactor: 0.85 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Berenjena',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 25, protein: 0.98, carbs: 5.88, fat: 0.18, fiber: 3.0 },
      { name: 'Asada', isDefault: false, calories: 33, protein: 0.83, carbs: 8.73, fat: 0.23, fiber: 2.7, weightFactor: 0.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 250 },
    ],
  },
  {
    name: 'Apio',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 16, protein: 0.69, carbs: 2.97, fat: 0.17, fiber: 1.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'rama', gramsPerUnit: 40 },
    ],
  },
  {
    name: 'Pepino',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 15, protein: 0.65, carbs: 3.63, fat: 0.11, fiber: 0.5 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 300 },
    ],
  },
  {
    name: 'Remolacha',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 43, protein: 1.61, carbs: 9.56, fat: 0.17, fiber: 2.8 },
      { name: 'Cocida', isDefault: false, calories: 44, protein: 1.68, carbs: 9.96, fat: 0.18, fiber: 2.0, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 130 },
    ],
  },
  {
    name: 'Nabo',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 28, protein: 0.9, carbs: 6.43, fat: 0.1, fiber: 1.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 120 },
    ],
  },
  {
    name: 'Rábano',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 16, protein: 0.68, carbs: 3.4, fat: 0.1, fiber: 1.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Espárrago',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 20, protein: 2.2, carbs: 3.88, fat: 0.12, fiber: 2.1 },
      { name: 'Cocido', isDefault: false, calories: 22, protein: 2.4, carbs: 4.11, fat: 0.22, fiber: 2.0, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 20 },
      { unitName: 'manojo', gramsPerUnit: 300 },
    ],
  },
  {
    name: 'Guisante',
    unit: 'g',
    defaultLocation: 'congelador',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 81, protein: 5.42, carbs: 14.46, fat: 0.4, fiber: 5.7 },
      { name: 'Cocido', isDefault: false, calories: 84, protein: 5.36, carbs: 15.64, fat: 0.22, fiber: 5.5, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Judías verdes',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 31, protein: 1.83, carbs: 6.97, fat: 0.22, fiber: 2.7 },
      { name: 'Cocidas', isDefault: false, calories: 35, protein: 1.89, carbs: 7.97, fat: 0.27, fiber: 3.4, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Maíz',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 86, protein: 3.27, carbs: 18.7, fat: 1.35, fiber: 2.0 },
      { name: 'Cocido', isDefault: false, calories: 96, protein: 3.41, carbs: 20.98, fat: 1.28, fiber: 2.4, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'mazorca', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Alcachofa',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 47, protein: 3.27, carbs: 10.51, fat: 0.15, fiber: 5.4 },
      { name: 'Cocida', isDefault: false, calories: 53, protein: 2.89, carbs: 12.37, fat: 0.36, fiber: 4.9, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 120 },
    ],
  },
  {
    name: 'Champiñón',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 22, protein: 3.09, carbs: 3.26, fat: 0.34, fiber: 1.0 },
      { name: 'Salteado', isDefault: false, calories: 29, protein: 3.79, carbs: 4.0, fat: 0.48, fiber: 1.1, weightFactor: 0.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 15 },
    ],
  },
  {
    name: 'Setas',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 22, protein: 3.09, carbs: 3.26, fat: 0.34, fiber: 1.0 },
      { name: 'Salteadas', isDefault: false, calories: 28, protein: 3.8, carbs: 3.9, fat: 0.45, fiber: 1.2, weightFactor: 0.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Cebolleta',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 32, protein: 1.83, carbs: 7.34, fat: 0.19, fiber: 2.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 15 },
    ],
  },
  {
    name: 'Acelga',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 19, protein: 1.8, carbs: 3.74, fat: 0.2, fiber: 1.6 },
      { name: 'Cocida', isDefault: false, calories: 20, protein: 1.88, carbs: 4.13, fat: 0.08, fiber: 2.1, weightFactor: 0.9 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Endivia',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 17, protein: 1.25, carbs: 3.35, fat: 0.2, fiber: 3.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 100 },
    ],
  },
  {
    name: 'Rúcula',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 25, protein: 2.58, carbs: 3.65, fat: 0.66, fiber: 1.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'manojo', gramsPerUnit: 80 },
    ],
  },
  {
    name: 'Canónigos',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 21, protein: 2.0, carbs: 3.63, fat: 0.4, fiber: 1.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Berros',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 11, protein: 2.3, carbs: 1.29, fat: 0.13, fiber: 0.5 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Escarola',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 17, protein: 1.25, carbs: 3.35, fat: 0.2, fiber: 3.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Coles de bruselas',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 43, protein: 3.38, carbs: 8.95, fat: 0.3, fiber: 3.8 },
      { name: 'Cocidas', isDefault: false, calories: 36, protein: 2.55, carbs: 7.11, fat: 0.5, fiber: 2.6, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 15 },
    ],
  },
  {
    name: 'Col blanca',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 25, protein: 1.28, carbs: 5.8, fat: 0.1, fiber: 2.5 },
      { name: 'Cocida', isDefault: false, calories: 23, protein: 1.27, carbs: 5.5, fat: 0.06, fiber: 2.3, weightFactor: 1.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Col lombarda',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 31, protein: 1.43, carbs: 7.37, fat: 0.16, fiber: 2.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Boniato',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 86, protein: 1.57, carbs: 20.12, fat: 0.05, fiber: 3.0 },
      { name: 'Asado', isDefault: false, calories: 90, protein: 2.01, carbs: 20.71, fat: 0.15, fiber: 3.3, weightFactor: 0.85 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 180 },
    ],
  },
  {
    name: 'Yuca',
    unit: 'g',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 160, protein: 1.36, carbs: 38.06, fat: 0.28, fiber: 1.8 },
      { name: 'Cocida', isDefault: false, calories: 112, protein: 0.77, carbs: 26.78, fat: 0.28, fiber: 1.0, weightFactor: 1.5 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Aceitunas verdes',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'En salmuera', isDefault: true, calories: 145, protein: 1.03, carbs: 3.84, fat: 15.32, fiber: 3.3 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 4 },
    ],
  },
  {
    name: 'Aceitunas negras',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'En conserva', isDefault: true, calories: 115, protein: 0.84, carbs: 6.26, fat: 10.9, fiber: 3.2 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 4 },
    ],
  },
  {
    name: 'Alcaparras',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'En salmuera', isDefault: true, calories: 23, protein: 2.36, carbs: 4.89, fat: 0.86, fiber: 3.2 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 9 },
    ],
  },
  {
    name: 'Aguacate',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 160, protein: 2.0, carbs: 8.53, fat: 14.66, fiber: 6.7 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Jengibre',
    unit: 'g',
    defaultLocation: 'nevera',
    preferredUnit: 'cm',
    variants: [
      { name: 'Fresco', isDefault: true, calories: 80, protein: 1.82, carbs: 17.77, fat: 0.75, fiber: 2.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'cucharadita', gramsPerUnit: 5 },
      { unitName: 'cm', gramsPerUnit: 6 },
    ],
  },
  {
    name: 'Hinojo',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 31, protein: 1.24, carbs: 7.3, fat: 0.2, fiber: 3.1 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 250 },
    ],
  },
  {
    name: 'Perejil',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Fresco', isDefault: true, calories: 36, protein: 2.97, carbs: 6.33, fat: 0.79, fiber: 3.3 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'manojo', gramsPerUnit: 40 },
      { unitName: 'cucharada', gramsPerUnit: 4 },
    ],
  },
  {
    name: 'Cilantro',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Fresco', isDefault: true, calories: 23, protein: 2.13, carbs: 3.67, fat: 0.52, fiber: 2.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'manojo', gramsPerUnit: 40 },
      { unitName: 'cucharada', gramsPerUnit: 4 },
    ],
  },
  {
    name: 'Albahaca',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Fresca', isDefault: true, calories: 23, protein: 3.15, carbs: 2.65, fat: 0.64, fiber: 1.6 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'manojo', gramsPerUnit: 20 },
      { unitName: 'hoja', gramsPerUnit: 0.5 },
    ],
  },
  {
    name: 'Menta',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Fresca', isDefault: true, calories: 70, protein: 3.75, carbs: 14.89, fat: 0.94, fiber: 8.0 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'manojo', gramsPerUnit: 20 },
    ],
  },
  {
    name: 'Cebolla caramelizada',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Cocinada', isDefault: true, calories: 91, protein: 1.9, carbs: 23.0, fat: 1.2, fiber: 1.5, weightFactor: 0.4 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
    ],
  },
  {
    name: 'Puerro',
    unit: 'g',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Crudo', isDefault: true, calories: 61, protein: 1.5, carbs: 14.15, fat: 0.3, fiber: 1.8 },
    ],
    conversions: [
      { unitName: 'kg', gramsPerUnit: 1000 },
      { unitName: 'unidad', gramsPerUnit: 90 },
    ],
  },
];
