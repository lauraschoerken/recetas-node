/**
 * FRUTAS — ~38 ingredientes
 * Macros por 100 g en crudo/fresco.
 * Fuente: USDA FoodData Central 2024-2025.
 */
import { IngredientSeedData } from "../types";

export const frutas: IngredientSeedData[] = [
  {
    name: "Manzana",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 52,
        protein: 0.26,
        carbs: 13.81,
        fat: 0.17,
        fiber: 2.4,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 180 },
    ],
  },
  {
    name: "Pera",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 57,
        protein: 0.36,
        carbs: 15.23,
        fat: 0.14,
        fiber: 3.1,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 180 },
    ],
  },
  {
    name: "Naranja",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 47,
        protein: 0.94,
        carbs: 11.75,
        fat: 0.12,
        fiber: 2.4,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 200 },
    ],
  },
  {
    name: "Limón",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 29,
        protein: 1.1,
        carbs: 9.32,
        fat: 0.3,
        fiber: 2.8,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 100 },
    ],
  },
  {
    name: "Plátano",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Maduro",
        isDefault: true,
        calories: 89,
        protein: 1.09,
        carbs: 22.84,
        fat: 0.33,
        fiber: 2.6,
      },
      {
        name: "Verde",
        isDefault: false,
        calories: 89,
        protein: 1.09,
        carbs: 22.84,
        fat: 0.33,
        fiber: 2.6,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 120 },
    ],
  },
  {
    name: "Mandarina",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 53,
        protein: 0.81,
        carbs: 13.34,
        fat: 0.31,
        fiber: 1.8,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 85 },
    ],
  },
  {
    name: "Pomelo",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 42,
        protein: 0.77,
        carbs: 10.66,
        fat: 0.14,
        fiber: 1.6,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 400 },
    ],
  },
  {
    name: "Fresa",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 32,
        protein: 0.67,
        carbs: 7.68,
        fat: 0.3,
        fiber: 2.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 12 },
    ],
  },
  {
    name: "Frambuesa",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 52,
        protein: 1.2,
        carbs: 11.94,
        fat: 0.65,
        fiber: 6.5,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Mora",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 43,
        protein: 1.39,
        carbs: 9.61,
        fat: 0.49,
        fiber: 5.3,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Arándano",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 57,
        protein: 0.74,
        carbs: 14.49,
        fat: 0.33,
        fiber: 2.4,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Uva",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 67,
        protein: 0.63,
        carbs: 17.15,
        fat: 0.35,
        fiber: 0.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "racimo", gramsPerUnit: 250 },
    ],
  },
  {
    name: "Melocotón",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 39,
        protein: 0.91,
        carbs: 9.54,
        fat: 0.25,
        fiber: 1.5,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 150 },
    ],
  },
  {
    name: "Albaricoque",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 48,
        protein: 1.4,
        carbs: 11.12,
        fat: 0.39,
        fiber: 2.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 40 },
    ],
  },
  {
    name: "Cereza",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 63,
        protein: 1.06,
        carbs: 16.01,
        fat: 0.2,
        fiber: 2.1,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 8 },
    ],
  },
  {
    name: "Ciruela",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 46,
        protein: 0.7,
        carbs: 11.42,
        fat: 0.28,
        fiber: 1.4,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 60 },
    ],
  },
  {
    name: "Mango",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 60,
        protein: 0.82,
        carbs: 14.98,
        fat: 0.38,
        fiber: 1.6,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 300 },
    ],
  },
  {
    name: "Piña",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 50,
        protein: 0.54,
        carbs: 13.12,
        fat: 0.12,
        fiber: 1.4,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Kiwi",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 61,
        protein: 1.14,
        carbs: 14.66,
        fat: 0.52,
        fiber: 3.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 80 },
    ],
  },
  {
    name: "Papaya",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 43,
        protein: 0.47,
        carbs: 10.82,
        fat: 0.26,
        fiber: 1.7,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Melón",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 34,
        protein: 0.84,
        carbs: 8.16,
        fat: 0.19,
        fiber: 0.9,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Sandía",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 30,
        protein: 0.61,
        carbs: 7.55,
        fat: 0.15,
        fiber: 0.4,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Granada",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 83,
        protein: 1.67,
        carbs: 18.7,
        fat: 1.17,
        fiber: 4.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 280 },
    ],
  },
  {
    name: "Higo",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 74,
        protein: 0.75,
        carbs: 19.18,
        fat: 0.3,
        fiber: 2.9,
      },
      {
        name: "Seco",
        isDefault: false,
        calories: 249,
        protein: 3.3,
        carbs: 63.87,
        fat: 0.93,
        fiber: 9.8,
        weightFactor: 0.4,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 50 },
    ],
  },
  {
    name: "Dátil",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seco",
        isDefault: true,
        calories: 277,
        protein: 1.81,
        carbs: 74.97,
        fat: 0.15,
        fiber: 6.7,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 8 },
    ],
  },
  {
    name: "Pasas",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Secas",
        isDefault: true,
        calories: 299,
        protein: 3.07,
        carbs: 79.18,
        fat: 0.46,
        fiber: 3.7,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 10 },
    ],
  },
  {
    name: "Coco",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Rallado",
        isDefault: true,
        calories: 354,
        protein: 3.3,
        carbs: 15.23,
        fat: 33.49,
        fiber: 9.0,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "cucharada", gramsPerUnit: 15 },
    ],
  },
  {
    name: "Lichi",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 66,
        protein: 0.83,
        carbs: 16.53,
        fat: 0.44,
        fiber: 1.3,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 10 },
    ],
  },
  {
    name: "Maracuyá",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 97,
        protein: 2.2,
        carbs: 23.38,
        fat: 0.7,
        fiber: 10.4,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 18 },
    ],
  },
  {
    name: "Guayaba",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 68,
        protein: 2.55,
        carbs: 14.32,
        fat: 0.95,
        fiber: 5.4,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Papaya",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 43,
        protein: 0.47,
        carbs: 10.82,
        fat: 0.26,
        fiber: 1.7,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  {
    name: "Caqui",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 70,
        protein: 0.58,
        carbs: 18.59,
        fat: 0.19,
        fiber: 3.6,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 200 },
    ],
  },
  {
    name: "Membrillo",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 57,
        protein: 0.4,
        carbs: 15.3,
        fat: 0.1,
        fiber: 1.9,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 250 },
    ],
  },
  {
    name: "Ciruela pasa",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seca",
        isDefault: true,
        calories: 240,
        protein: 2.18,
        carbs: 63.88,
        fat: 0.38,
        fiber: 7.1,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 10 },
    ],
  },
  {
    name: "Albaricoque seco",
    unit: "g",
    defaultLocation: "despensa",
    variants: [
      {
        name: "Seco",
        isDefault: true,
        calories: 241,
        protein: 3.39,
        carbs: 62.64,
        fat: 0.51,
        fiber: 7.3,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 8 },
    ],
  },
  {
    name: "Lima",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresca",
        isDefault: true,
        calories: 30,
        protein: 0.7,
        carbs: 10.54,
        fat: 0.2,
        fiber: 2.8,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 67 },
    ],
  },
  {
    name: "Pomelo rosa",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 42,
        protein: 0.77,
        carbs: 10.66,
        fat: 0.14,
        fiber: 1.6,
      },
    ],
    conversions: [
      { unitName: "kg", gramsPerUnit: 1000 },
      { unitName: "unidad", gramsPerUnit: 350 },
    ],
  },
  {
    name: "Melón cantalupo",
    unit: "g",
    defaultLocation: "nevera",
    variants: [
      {
        name: "Fresco",
        isDefault: true,
        calories: 34,
        protein: 0.84,
        carbs: 8.16,
        fat: 0.19,
        fiber: 0.9,
      },
    ],
    conversions: [{ unitName: "kg", gramsPerUnit: 1000 }],
  },
  // ── AÑADIDOS DESDE SQL ──────────────────────────────────────────────────
  {
    name: "Nectarina",
    unit: "g",
    variants: [
      {
        name: "Cruda",
        isDefault: true,
        calories: 44,
        protein: 1.1,
        carbs: 10.6,
        fat: 0.3,
        fiber: 1.7,
      },
    ],
    conversions: [{ unitName: "nectarina mediana", gramsPerUnit: 150 }],
  },
  {
    name: "Plátano de Canarias",
    unit: "g",
    variants: [
      {
        name: "Crudo (maduro)",
        isDefault: true,
        calories: 92,
        protein: 1.2,
        carbs: 24,
        fat: 0.3,
        fiber: 2.8,
      },
      {
        name: "Crudo (verde)",
        isDefault: false,
        calories: 100,
        protein: 1.3,
        carbs: 26,
        fat: 0.3,
        fiber: 2.2,
      },
    ],
    conversions: [
      { unitName: "plátano de Canarias", gramsPerUnit: 100 },
      { unitName: "plátano de Canarias grande", gramsPerUnit: 140 },
    ],
  },
  {
    name: "Chirimoya",
    unit: "g",
    variants: [
      {
        name: "Cruda",
        isDefault: true,
        calories: 75,
        protein: 1.6,
        carbs: 17.7,
        fat: 0.7,
        fiber: 3,
      },
    ],
    conversions: [{ unitName: "chirimoya mediana", gramsPerUnit: 250 }],
  },
];
