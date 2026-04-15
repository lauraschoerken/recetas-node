/**
 * SALSAS, CONSERVAS Y CALDOS — ~22 ingredientes
 * Fuente: USDA FoodData Central + etiquetas nutricionales 2024-2025.
 */
import { IngredientSeedData } from "../types";

export const salsasCaldos: IngredientSeedData[] = [
  // ── TOMATE Y DERIVADOS ─────────────────────────────────────────────────
  {
    name: "Tomate triturado",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "En conserva",
        isDefault: true,
        calories: 18,
        protein: 0.9,
        carbs: 3.9,
        fat: 0.2,
        fiber: 1.2,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "bote", gramsPerUnit: 400 },
      { unitName: "lata", gramsPerUnit: 400 },
    ],
  },
  {
    name: "Tomate frito",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Frito en aceite",
        isDefault: true,
        calories: 71,
        protein: 1.5,
        carbs: 9.1,
        fat: 3.3,
        fiber: 1.5,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "bote", gramsPerUnit: 350 },
      { unitName: "cucharada", gramsPerUnit: 20 },
    ],
  },
  {
    name: "Pasta de tomate",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Concentrada",
        isDefault: true,
        calories: 82,
        protein: 4.3,
        carbs: 18.9,
        fat: 0.5,
        fiber: 4.1,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "bote", gramsPerUnit: 70 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  {
    name: "Salsa de tomate",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Napolitana",
        isDefault: true,
        calories: 53,
        protein: 1.7,
        carbs: 8.8,
        fat: 1.5,
        fiber: 1.5,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "tarro", gramsPerUnit: 350 },
      { unitName: "cucharada", gramsPerUnit: 20 },
    ],
  },
  {
    name: "Tomates secos",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Deshidratados en aceite",
        isDefault: true,
        calories: 258,
        protein: 14.1,
        carbs: 55.8,
        fat: 3.0,
        fiber: 12.3,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "tarro", gramsPerUnit: 250 },
    ],
  },
  // ── CALDOS ─────────────────────────────────────────────────────────────
  {
    name: "Caldo de verduras",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Casero/brick",
        isDefault: true,
        calories: 3,
        protein: 0.1,
        carbs: 0.7,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "brick", gramsPerUnit: 1000 },
      { unitName: "taza", gramsPerUnit: 240 },
    ],
  },
  {
    name: "Caldo de pollo",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Casero/brick",
        isDefault: true,
        calories: 8,
        protein: 1.5,
        carbs: 0.1,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "brick", gramsPerUnit: 1000 },
    ],
  },
  {
    name: "Caldo de carne",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Casero/brick",
        isDefault: true,
        calories: 8,
        protein: 1.5,
        carbs: 0.1,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "brick", gramsPerUnit: 1000 },
    ],
  },
  {
    name: "Caldo de pescado",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Casero/brick",
        isDefault: true,
        calories: 5,
        protein: 1.0,
        carbs: 0.0,
        fat: 0.1,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "brick", gramsPerUnit: 500 },
    ],
  },
  {
    name: "Pastilla de caldo",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Avecrem / Caldo en pastilla",
        isDefault: true,
        calories: 230,
        protein: 6.0,
        carbs: 30.0,
        fat: 10.0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "pastilla", gramsPerUnit: 10 },
    ],
  },
  // ── VINOS Y LICORES PARA COCINAR ───────────────────────────────────────
  {
    name: "Vino blanco",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Seco (para cocinar)",
        isDefault: true,
        calories: 82,
        protein: 0.07,
        carbs: 2.6,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "copa", gramsPerUnit: 150 },
    ],
  },
  {
    name: "Vino tinto",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seco (para cocinar)",
        isDefault: true,
        calories: 85,
        protein: 0.07,
        carbs: 2.6,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "copa", gramsPerUnit: 150 },
    ],
  },
  {
    name: "Vino de Jerez",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Fino / Manzanilla",
        isDefault: true,
        calories: 73,
        protein: 0.1,
        carbs: 0.5,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "copa", gramsPerUnit: 100 },
    ],
  },
  {
    name: "Cerveza",
    unit: "ml",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Rubia 5%",
        isDefault: true,
        calories: 43,
        protein: 0.46,
        carbs: 3.55,
        fat: 0,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "lata (330ml)", gramsPerUnit: 330 },
      { unitName: "botellín", gramsPerUnit: 250 },
    ],
  },
  // ── LECHES Y CREMAS VEGETALES ──────────────────────────────────────────
  {
    name: "Leche evaporada",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "En lata",
        isDefault: true,
        calories: 135,
        protein: 6.81,
        carbs: 10.04,
        fat: 7.56,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "lata", gramsPerUnit: 410 },
    ],
  },
  // ── SALSAS ESPECIALES ─────────────────────────────────────────────────
  {
    name: "Pesto",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Genovés albahaca",
        isDefault: true,
        calories: 432,
        protein: 9.6,
        carbs: 5.5,
        fat: 42.9,
        fiber: 1.5,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
      { unitName: "tarro", gramsPerUnit: 190 },
    ],
  },
  {
    name: "Salsa bechamel",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Casera",
        isDefault: true,
        calories: 109,
        protein: 3.7,
        carbs: 10.5,
        fat: 6.0,
        fiber: 0.3,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Crema agria",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Comercial",
        isDefault: true,
        calories: 193,
        protein: 2.1,
        carbs: 4.5,
        fat: 19.4,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 24 },
    ],
  },
  {
    name: "Salsa romesco",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Casera / comercial",
        isDefault: true,
        calories: 265,
        protein: 5.5,
        carbs: 15.0,
        fat: 21.0,
        fiber: 3.5,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 20 },
    ],
  },
  {
    name: "Salsa teriyaki",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Comercial",
        isDefault: true,
        calories: 89,
        protein: 5.7,
        carbs: 14.5,
        fat: 0.1,
        fiber: 0.1,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  {
    name: "Salsa hoisin",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Comercial",
        isDefault: true,
        calories: 220,
        protein: 4.0,
        carbs: 37.0,
        fat: 12.0,
        fiber: 1.7,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 18 },
    ],
  },
  {
    name: "Salsa de pescado (Fish sauce)",
    unit: "ml",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Nam pla",
        isDefault: true,
        calories: 35,
        protein: 5.06,
        carbs: 3.64,
        fat: 0.01,
        fiber: 0,
      },
    ],
    conversions: [
      { unitName: "l", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
];
