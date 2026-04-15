/**
 * BEBIDAS — ~14 ingredientes
 * Todos tienen unit: 'ml'. Macros por 100 ml.
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from '../types';

export const bebidas: IngredientSeedData[] = [
  {
    name: 'Agua',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Natural', isDefault: true, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'vaso', gramsPerUnit: 250 },
      { unitName: 'taza', gramsPerUnit: 240 },
    ],
  },
  {
    name: 'Zumo de naranja',
    unit: 'ml',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Natural/brick', isDefault: true, calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2, fiber: 0.2 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'vaso', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Zumo de limón',
    unit: 'ml',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Natural exprimido', isDefault: true, calories: 22, protein: 0.35, carbs: 6.9, fat: 0.24, fiber: 0.3 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'cucharada', gramsPerUnit: 15 },
      { unitName: 'limón (zumo)', gramsPerUnit: 30 },
    ],
  },
  {
    name: 'Zumo de manzana',
    unit: 'ml',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Sin azúcar añadido', isDefault: true, calories: 46, protein: 0.1, carbs: 11.7, fat: 0.1, fiber: 0.2 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'vaso', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Zumo de tomate',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Sin sal', isDefault: true, calories: 17, protein: 0.76, carbs: 4.24, fat: 0.05, fiber: 0.4 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'vaso', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Zumo de pomelo',
    unit: 'ml',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Natural', isDefault: true, calories: 39, protein: 0.5, carbs: 9.2, fat: 0.1, fiber: 0.1 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'vaso', gramsPerUnit: 200 },
    ],
  },
  {
    name: 'Café',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Espresso', isDefault: true, calories: 9, protein: 0.12, carbs: 1.67, fat: 0.2, fiber: 0 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'taza espresso', gramsPerUnit: 30 },
      { unitName: 'taza larga', gramsPerUnit: 180 },
    ],
  },
  {
    name: 'Té verde',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Infusión', isDefault: true, calories: 1, protein: 0, carbs: 0.2, fat: 0, fiber: 0 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'taza', gramsPerUnit: 240 },
    ],
  },
  {
    name: 'Té negro',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Infusión', isDefault: true, calories: 1, protein: 0, carbs: 0.3, fat: 0, fiber: 0 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'taza', gramsPerUnit: 240 },
    ],
  },
  {
    name: 'Chocolate a la taza',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Preparado con leche', isDefault: true, calories: 74, protein: 2.8, carbs: 12.5, fat: 1.8, fiber: 0.5 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'taza', gramsPerUnit: 250 },
    ],
  },
  {
    name: 'Vino rosado',
    unit: 'ml',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Rosado seco', isDefault: true, calories: 70, protein: 0.07, carbs: 2.3, fat: 0, fiber: 0 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'copa', gramsPerUnit: 150 },
    ],
  },
  {
    name: 'Sidra',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Natural fermentada', isDefault: true, calories: 44, protein: 0, carbs: 4.4, fat: 0, fiber: 0 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'botellín', gramsPerUnit: 750 },
    ],
  },
  {
    name: 'Leche de soja',
    unit: 'ml',
    defaultLocation: 'nevera',
    variants: [
      { name: 'Sin azúcar', isDefault: true, calories: 33, protein: 3.27, carbs: 1.75, fat: 1.8, fiber: 0.6 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'vaso', gramsPerUnit: 250 },
    ],
  },
  {
    name: 'Bebida de arroz',
    unit: 'ml',
    defaultLocation: 'despensa',
    variants: [
      { name: 'Sin azúcar', isDefault: true, calories: 47, protein: 0.3, carbs: 9.9, fat: 1.0, fiber: 0.1 },
    ],
    conversions: [
      { unitName: 'l', gramsPerUnit: 1000 },
      { unitName: 'vaso', gramsPerUnit: 250 },
    ],
  },
];
