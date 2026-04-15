/**
 * LÁCTEOS Y HUEVOS — ~30 ingredientes
 * Macros por 100 g / 100 ml según corresponda.
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from "../types";

export const lacteosHuevos: IngredientSeedData[] = [
  // ── HUEVOS ─────────────────────────────────────────────────────────────
  {
    name: "Huevo",
    unit: "g",
    defaultLocation: "nevera",
    preferredUnit: "unidad",
    variants: [
      {
        name: "Crudo",
        isDefault: true,
        calories: 155,
        protein: 12.56,
        carbs: 1.12,
        fat: 10.6,
        fiber: 0,
      },
      {
        name: "Cocido",
        isDefault: false,
        calories: 155,
        protein: 12.58,
        carbs: 1.12,
        fat: 10.6,
        fiber: 0,
        weightFactor: 1.0,
      },
      {
        name: "Revuelto",
        isDefault: false,
        calories: 150,
        protein: 11.1,
        carbs: 2.2,
        fat: 10.5,
        fiber: 0,
        weightFactor: 1.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 60 },
      { unitName: "unidad pequeña", gramsPerUnit: 50 },
      { unitName: "unidad grande", gramsPerUnit: 70 },
    ],
  },
  {
    name: "Clara de huevo",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Crudo",
        isDefault: true,
        calories: 52,
        protein: 10.9,
        carbs: 0.73,
        fat: 0.17,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 35 },
    ],
  },
  {
    name: "Yema de huevo",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Crudo",
        isDefault: true,
        calories: 322,
        protein: 15.86,
        carbs: 3.59,
        fat: 26.54,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 20 },
    ],
  },
  {
    name: "Huevo de codorniz",
    unit: "g",
    defaultLocation: "nevera",
    preferredUnit: "unidad",
    variants: [
      {
        name: "Crudo",
        isDefault: true,
        calories: 158,
        protein: 13.05,
        carbs: 0.41,
        fat: 11.09,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 9 },
    ],
  },
  // ── LECHES ─────────────────────────────────────────────────────────────
  {
    name: "Leche entera",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Entera",
        isDefault: true,
        calories: 61,
        protein: 3.15,
        carbs: 4.8,
        fat: 3.25,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "vaso", gramsPerUnit: 250 },
      { unitName: "taza", gramsPerUnit: 240 },
    ],
  },
  {
    name: "Leche semidesnatada",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Semidesnatada",
        isDefault: true,
        calories: 47,
        protein: 3.3,
        carbs: 4.7,
        fat: 1.5,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "vaso", gramsPerUnit: 250 },
    ],
  },
  {
    name: "Leche desnatada",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Desnatada",
        isDefault: true,
        calories: 34,
        protein: 3.37,
        carbs: 4.96,
        fat: 0.08,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "vaso", gramsPerUnit: 250 },
    ],
  },
  {
    name: "Leche de coco",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Entera (lata)",
        isDefault: true,
        calories: 197,
        protein: 2.02,
        carbs: 5.54,
        fat: 21.33,
        fiber: 2.2,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "lata", gramsPerUnit: 400 },
    ],
  },
  {
    name: "Leche de almendras",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Sin azúcar",
        isDefault: true,
        calories: 17,
        protein: 0.7,
        carbs: 1.3,
        fat: 1.1,
        fiber: 0.5,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "vaso", gramsPerUnit: 250 },
    ],
  },
  {
    name: "Leche de avena",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Sin azúcar",
        isDefault: true,
        calories: 47,
        protein: 1.0,
        carbs: 9.0,
        fat: 1.5,
        fiber: 0.8,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "vaso", gramsPerUnit: 250 },
    ],
  },
  // ── NATA / CREMA ───────────────────────────────────────────────────────
  {
    name: "Nata para montar",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Líquida 35% M.G.",
        isDefault: true,
        calories: 340,
        protein: 2.3,
        carbs: 2.6,
        fat: 35.0,
        fiber: 0,
      },
      {
        name: "Montada",
        isDefault: false,
        calories: 257,
        protein: 1.9,
        carbs: 2.1,
        fat: 26.7,
        fiber: 0,
        weightFactor: 1.5,
      },
    ],
    conversions: [{ unitName: "l", gramsPerUnit: 1000 }],
  },
  {
    name: "Nata para cocinar",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "18% M.G.",
        isDefault: true,
        calories: 192,
        protein: 2.7,
        carbs: 2.8,
        fat: 19.3,
        fiber: 0,
      },
    ],
    conversions: [{ unitName: "l", gramsPerUnit: 1000 }],
  },
  {
    name: "Crème fraîche",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "30% M.G.",
        isDefault: true,
        calories: 292,
        protein: 2.2,
        carbs: 2.9,
        fat: 30.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  // ── MANTEQUILLA / MARGARINA ────────────────────────────────────────────
  {
    name: "Mantequilla",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Sin sal",
        isDefault: true,
        calories: 717,
        protein: 0.85,
        carbs: 0.06,
        fat: 81.11,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  },
  {
    name: "Margarina",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Vegetal",
        isDefault: true,
        calories: 718,
        protein: 0.16,
        carbs: 0.9,
        fat: 80.71,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 14 },
    ],
  },
  // ── YOGURES ────────────────────────────────────────────────────────────
  {
    name: "Yogur natural",
    unit: "g",
    defaultLocation: "nevera",
    preferredUnit: "unidad",
    variants: [
      {
        name: "Natural entero",
        isDefault: true,
        calories: 61,
        protein: 3.47,
        carbs: 4.66,
        fat: 3.25,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 125 },
    ],
  },
  {
    name: "Yogur griego",
    unit: "g",
    defaultLocation: "nevera",
    preferredUnit: "unidad",
    variants: [
      {
        name: "Natural sin azúcar",
        isDefault: true,
        calories: 97,
        protein: 9.0,
        carbs: 3.87,
        fat: 5.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 150 },
    ],
  },
  {
    name: "Yogur desnatado",
    unit: "g",
    defaultLocation: "nevera",
    preferredUnit: "unidad",
    variants: [
      {
        name: "Desnatado",
        isDefault: true,
        calories: 35,
        protein: 3.5,
        carbs: 4.7,
        fat: 0.2,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 125 },
    ],
  },
  // ── QUESOS ─────────────────────────────────────────────────────────────
  {
    name: "Queso parmesano",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Rallado",
        isDefault: true,
        calories: 431,
        protein: 38.0,
        carbs: 4.1,
        fat: 28.6,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 10 },
    ],
  },
  {
    name: "Queso manchego",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Curado",
        isDefault: true,
        calories: 433,
        protein: 28.6,
        carbs: 1.2,
        fat: 34.4,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "loncha", gramsPerUnit: 25 },
    ],
  },
  {
    name: "Queso mozzarella",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 280,
        protein: 28.0,
        carbs: 2.2,
        fat: 17.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "bola", gramsPerUnit: 125 },
    ],
  },
  {
    name: "Queso feta",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "En salmuera",
        isDefault: true,
        calories: 264,
        protein: 14.2,
        carbs: 4.1,
        fat: 21.3,
        fiber: 0,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Queso gouda",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Semicurado",
        isDefault: true,
        calories: 356,
        protein: 24.9,
        carbs: 2.2,
        fat: 27.4,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "loncha", gramsPerUnit: 25 },
    ],
  },
  {
    name: "Queso cheddar",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Curado",
        isDefault: true,
        calories: 403,
        protein: 24.9,
        carbs: 1.3,
        fat: 33.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "loncha", gramsPerUnit: 25 },
    ],
  },
  {
    name: "Queso brie",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Maduro",
        isDefault: true,
        calories: 334,
        protein: 20.75,
        carbs: 0.45,
        fat: 27.68,
        fiber: 0,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Queso azul",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Tipo Roquefort",
        isDefault: true,
        calories: 353,
        protein: 21.4,
        carbs: 2.3,
        fat: 28.7,
        fiber: 0,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Queso ricotta",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 174,
        protein: 11.3,
        carbs: 3.0,
        fat: 13.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 30 },
    ],
  },
  {
    name: "Queso cottage",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Bajo en grasa",
        isDefault: true,
        calories: 98,
        protein: 11.1,
        carbs: 3.4,
        fat: 4.3,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 30 },
    ],
  },
  {
    name: "Queso crema",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Philadelphia tipo",
        isDefault: true,
        calories: 342,
        protein: 5.9,
        carbs: 4.1,
        fat: 34.2,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 30 },
    ],
  },
  {
    name: "Leche condensada",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Azucarada",
        isDefault: true,
        calories: 321,
        protein: 7.9,
        carbs: 54.4,
        fat: 8.7,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 20 },
      { unitName: "bote", gramsPerUnit: 370 },
    ],
  },
];
