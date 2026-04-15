/**
 * CONDIMENTOS Y ESPECIAS — ~50 ingredientes
 * Macros por 100 g (las especias secas tienen macros elevados pero se usan en pequeñas cantidades).
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from "../types";

export const condimentosEspecias: IngredientSeedData[] = [
  // ── BÁSICOS ────────────────────────────────────────────────────────────
  {
    name: "Sal",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Fina",
        isDefault: true,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 18 },
      { unitName: "cucharadita", gramsPerUnit: 6 },
      { unitName: "pizca", gramsPerUnit: 0.5 },
    ],
  },
  {
    name: "Sal gruesa",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Marina",
        isDefault: true,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 20 },
    ],
  },
  {
    name: "Azúcar",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Blanco",
        isDefault: true,
        calories: 387,
        protein: 0,
        carbs: 99.98,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 12 },
      { unitName: "cucharadita", gramsPerUnit: 4 },
    ],
  },
  {
    name: "Azúcar moreno",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Sin refinar",
        isDefault: true,
        calories: 380,
        protein: 0.12,
        carbs: 98.09,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 12 },
      { unitName: "cucharadita", gramsPerUnit: 4 },
    ],
  },
  {
    name: "Azúcar glas",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "En polvo",
        isDefault: true,
        calories: 389,
        protein: 0,
        carbs: 99.0,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 8 },
    ],
  },
  {
    name: "Miel",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Pura de abeja",
        isDefault: true,
        calories: 304,
        protein: 0.3,
        carbs: 82.4,
        fat: 0,
        fiber: 0.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 21 },
      { unitName: "cucharadita", gramsPerUnit: 7 },
    ],
  },
  {
    name: "Sirope de arce",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Puro",
        isDefault: true,
        calories: 260,
        protein: 0,
        carbs: 67.0,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 20 },
    ],
  },
  // ── VINAGRES ────────────────────────────────────────────────────────────
  {
    name: "Vinagre de vino blanco",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Blanco",
        isDefault: true,
        calories: 19,
        protein: 0,
        carbs: 0.6,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Vinagre de vino tinto",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Tinto",
        isDefault: true,
        calories: 19,
        protein: 0,
        carbs: 0.6,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  {
    name: "Vinagre balsámico",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "De Módena",
        isDefault: true,
        calories: 88,
        protein: 0.49,
        carbs: 17.03,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Vinagre de manzana",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Sin filtrar",
        isDefault: true,
        calories: 22,
        protein: 0,
        carbs: 0.93,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  // ── SALSAS BÁSICAS ─────────────────────────────────────────────────────
  {
    name: "Mostaza Dijon",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Dijon",
        isDefault: true,
        calories: 66,
        protein: 4.73,
        carbs: 5.27,
        fat: 3.34,
        fiber: 3.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Mostaza americana",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Amarilla",
        isDefault: true,
        calories: 60,
        protein: 3.7,
        carbs: 5.9,
        fat: 3.3,
        fiber: 2.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  {
    name: "Ketchup",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Clásico",
        isDefault: true,
        calories: 112,
        protein: 1.6,
        carbs: 27.6,
        fat: 0.2,
        fiber: 0.7,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 17 },
    ],
  },
  {
    name: "Mayonesa",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Comercial",
        isDefault: true,
        calories: 680,
        protein: 1.0,
        carbs: 0.6,
        fat: 74.85,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 13 },
    ],
  },
  {
    name: "Salsa de soja",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Tamari / Soja",
        isDefault: true,
        calories: 60,
        protein: 10.51,
        carbs: 5.57,
        fat: 0.1,
        fiber: 0.8,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Salsa Worcestershire",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Perrins",
        isDefault: true,
        calories: 78,
        protein: 0,
        carbs: 18.0,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Tabasco",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Rojo",
        isDefault: true,
        calories: 12,
        protein: 0.6,
        carbs: 2.0,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Sriracha",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Picante",
        isDefault: true,
        calories: 93,
        protein: 1.0,
        carbs: 18.0,
        fat: 2.0,
        fiber: 1.0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  {
    name: "Salsa de ostras",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Clásica",
        isDefault: true,
        calories: 82,
        protein: 1.26,
        carbs: 13.85,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 18 },
    ],
  },
  {
    name: "Miso",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Blanco (shiro)",
        isDefault: true,
        calories: 199,
        protein: 11.69,
        carbs: 27.86,
        fat: 6.0,
        fiber: 5.4,
      },
      {
        name: "Rojo (aka)",
        isDefault: false,
        calories: 210,
        protein: 13.0,
        carbs: 27.5,
        fat: 5.9,
        fiber: 5.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 17 },
    ],
  },
  // ── ESPECIAS SECAS ─────────────────────────────────────────────────────
  {
    name: "Pimienta negra",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molida",
        isDefault: true,
        calories: 251,
        protein: 10.39,
        carbs: 63.95,
        fat: 3.26,
        fiber: 25.3,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2.3 },
      { unitName: "pizca", gramsPerUnit: 0.3 },
    ],
  },
  {
    name: "Pimentón dulce",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Dulce molido",
        isDefault: true,
        calories: 290,
        protein: 14.76,
        carbs: 56.32,
        fat: 12.89,
        fiber: 34.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 7 },
      { unitName: "cucharadita", gramsPerUnit: 2.3 },
    ],
  },
  {
    name: "Pimentón picante",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Picante molido",
        isDefault: true,
        calories: 282,
        protein: 13.46,
        carbs: 50.22,
        fat: 12.89,
        fiber: 27.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2.3 },
    ],
  },
  {
    name: "Comino",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molido",
        isDefault: true,
        calories: 375,
        protein: 17.81,
        carbs: 44.24,
        fat: 22.27,
        fiber: 10.5,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2.6 },
    ],
  },
  {
    name: "Curry en polvo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Mezcla clásica",
        isDefault: true,
        calories: 325,
        protein: 12.66,
        carbs: 55.83,
        fat: 14.01,
        fiber: 33.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 6 },
      { unitName: "cucharadita", gramsPerUnit: 2 },
    ],
  },
  {
    name: "Cúrcuma",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "En polvo",
        isDefault: true,
        calories: 354,
        protein: 7.83,
        carbs: 64.93,
        fat: 9.88,
        fiber: 21.1,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 3.0 },
    ],
  },
  {
    name: "Canela",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molida",
        isDefault: true,
        calories: 247,
        protein: 3.99,
        carbs: 80.59,
        fat: 1.24,
        fiber: 53.1,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2.6 },
      { unitName: "rama", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Nuez moscada",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molida",
        isDefault: true,
        calories: 525,
        protein: 5.84,
        carbs: 49.29,
        fat: 36.31,
        fiber: 20.8,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2.5 },
    ],
  },
  {
    name: "Orégano",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seco",
        isDefault: true,
        calories: 265,
        protein: 9.0,
        carbs: 68.92,
        fat: 4.28,
        fiber: 42.5,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 3 },
      { unitName: "cucharadita", gramsPerUnit: 1 },
    ],
  },
  {
    name: "Tomillo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seco",
        isDefault: true,
        calories: 276,
        protein: 9.11,
        carbs: 63.94,
        fat: 7.43,
        fiber: 37.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 1.2 },
      { unitName: "rama", gramsPerUnit: 2 },
    ],
  },
  {
    name: "Romero",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seco",
        isDefault: true,
        calories: 331,
        protein: 5.18,
        carbs: 64.06,
        fat: 15.22,
        fiber: 42.6,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 1.5 },
      { unitName: "rama", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Laurel",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Hoja seca",
        isDefault: true,
        calories: 313,
        protein: 7.61,
        carbs: 74.97,
        fat: 8.36,
        fiber: 26.3,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "hoja", gramsPerUnit: 0.5 },
    ],
  },
  {
    name: "Clavo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molido",
        isDefault: true,
        calories: 323,
        protein: 5.97,
        carbs: 65.53,
        fat: 13.0,
        fiber: 33.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2 },
      { unitName: "unidad", gramsPerUnit: 0.3 },
    ],
  },
  {
    name: "Cardamomo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molido",
        isDefault: true,
        calories: 311,
        protein: 10.76,
        carbs: 68.47,
        fat: 6.7,
        fiber: 28.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2 },
    ],
  },
  {
    name: "Azafrán",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Hebras",
        isDefault: true,
        calories: 310,
        protein: 11.43,
        carbs: 65.37,
        fat: 5.85,
        fiber: 3.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "sobre", gramsPerUnit: 0.125 },
    ],
  },
  {
    name: "Ras el hanout",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Mezcla marroquí",
        isDefault: true,
        calories: 305,
        protein: 12.0,
        carbs: 55.0,
        fat: 11.0,
        fiber: 25.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 3 },
    ],
  },
  {
    name: "Ajo en polvo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "En polvo",
        isDefault: true,
        calories: 331,
        protein: 16.55,
        carbs: 72.73,
        fat: 0.73,
        fiber: 9.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 3 },
    ],
  },
  {
    name: "Cebolla en polvo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Deshidratada",
        isDefault: true,
        calories: 341,
        protein: 8.27,
        carbs: 79.12,
        fat: 0.87,
        fiber: 15.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 3 },
    ],
  },
  {
    name: "Guindilla",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seca entera",
        isDefault: true,
        calories: 282,
        protein: 13.46,
        carbs: 50.22,
        fat: 12.89,
        fiber: 27.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 3 },
    ],
  },
  {
    name: "Cayena",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molida",
        isDefault: true,
        calories: 318,
        protein: 12.01,
        carbs: 56.63,
        fat: 17.27,
        fiber: 27.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 1.8 },
      { unitName: "pizca", gramsPerUnit: 0.3 },
    ],
  },
  {
    name: "Pimienta blanca",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Molida",
        isDefault: true,
        calories: 296,
        protein: 10.4,
        carbs: 68.61,
        fat: 2.12,
        fiber: 26.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2.4 },
    ],
  },
  {
    name: "Mezcla de especias italiana",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Hierba provenzal",
        isDefault: true,
        calories: 270,
        protein: 9.0,
        carbs: 55.0,
        fat: 6.0,
        fiber: 35.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 2.0 },
    ],
  },
  {
    name: "Mezcla para paella",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Condimento paella",
        isDefault: true,
        calories: 290,
        protein: 10.0,
        carbs: 58.0,
        fat: 9.0,
        fiber: 30.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "sobre", gramsPerUnit: 10 },
    ],
  },
  // ── LEVADURAS Y LEAVENING ──────────────────────────────────────────────
  {
    name: "Levadura seca de panadería",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Instantánea",
        isDefault: true,
        calories: 325,
        protein: 40.44,
        carbs: 41.22,
        fat: 7.61,
        fiber: 26.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "sobre", gramsPerUnit: 7 },
      { unitName: "cucharadita", gramsPerUnit: 4 },
    ],
  },
  {
    name: "Levadura química",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Polvos de hornear",
        isDefault: true,
        calories: 53,
        protein: 0,
        carbs: 27.7,
        fat: 0,
        fiber: 0.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "sobre", gramsPerUnit: 16 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Bicarbonato sódico",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Alimentario",
        isDefault: true,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharadita", gramsPerUnit: 6 },
    ],
  },
  {
    name: "Gelatina",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "En hoja (neutra)",
        isDefault: true,
        calories: 335,
        protein: 85.6,
        carbs: 0,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "hoja", gramsPerUnit: 1.7 },
    ],
  },
  {
    name: "Cacao en polvo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Sin azúcar",
        isDefault: true,
        calories: 228,
        protein: 19.6,
        carbs: 57.9,
        fat: 13.7,
        fiber: 37.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 7 },
    ],
  },
  {
    name: "Chocolate negro",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "70-85% cacao",
        isDefault: true,
        calories: 598,
        protein: 7.79,
        carbs: 45.9,
        fat: 42.63,
        fiber: 10.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "onza (cuadrado)", gramsPerUnit: 10 },
    ],
  },
  {
    name: "Vainilla",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Extracto puro (equivalencia polvo)",
        isDefault: true,
        calories: 288,
        protein: 0.1,
        carbs: 12.65,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "vaina", gramsPerUnit: 2 },
      { unitName: "cucharadita extracto", gramsPerUnit: 4 },
    ],
  },
];
