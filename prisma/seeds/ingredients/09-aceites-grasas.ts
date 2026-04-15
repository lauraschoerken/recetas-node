/**
 * ACEITES Y GRASAS — ~10 ingredientes
 * Todos tienen unit: 'ml'. Macros por 100 ml.
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from "../types";

export const aceitesGrasas: IngredientSeedData[] = [
  {
    name: "Aceite de oliva virgen extra",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Virgen extra",
        isDefault: true,
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
      { unitName: "vaso", gramsPerUnit: 200 },
    ],
  },
  {
    name: "Aceite de oliva",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Suave (0,4°)",
        isDefault: true,
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Aceite de girasol",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Refinado",
        isDefault: true,
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Aceite de coco",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Virgen",
        isDefault: true,
        calories: 862,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 13 },
    ],
  },
  {
    name: "Aceite de sésamo",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Tostado",
        isDefault: true,
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Aceite de aguacate",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Virgen",
        isDefault: true,
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
    ],
  },
  {
    name: "Ghee",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Mantequilla clarificada",
        isDefault: true,
        calories: 900,
        protein: 0,
        carbs: 0,
        fat: 99.8,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 13 },
    ],
  },
  {
    name: "Manteca de cerdo",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Refinada",
        isDefault: true,
        calories: 902,
        protein: 0,
        carbs: 0,
        fat: 99.5,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 13 },
    ],
  },
  {
    name: "Aceite de maíz",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Refinado",
        isDefault: true,
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
    ],
  },
  {
    name: "Aceite de semillas",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Refinado",
        isDefault: true,
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
    ],
  },
];
