/**
 * Script de seed para crear ingredientes básicos faltantes y 30 recetas de ejemplo.
 * Ejecutar con: npx ts-node prisma/seed-recipes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper: obtener ID de ingrediente por nombre (solo GLOBAL)
async function ing(name: string): Promise<number | null> {
  const i = await prisma.ingredient.findFirst({
    where: { name, status: "GLOBAL" },
  });
  return i?.id ?? null;
}

// Helper: obtener ID de variante por nombre e ingrediente
async function variant(
  ingredientId: number,
  variantName: string,
): Promise<number | null> {
  const v = await prisma.ingredientVariant.findFirst({
    where: { ingredientId, name: variantName },
  });
  return v?.id ?? null;
}

// Helper: crear ingrediente con variante si no existe
async function ensureIngredient(
  name: string,
  unit: string,
  variants: {
    name: string;
    isDefault: boolean;
    cal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    wf?: number;
  }[],
  conversions: { unitName: string; gramsPerUnit: number }[] = [],
): Promise<number> {
  let i = await prisma.ingredient.findFirst({
    where: { name, status: "GLOBAL" },
  });
  if (!i) {
    i = await prisma.ingredient.create({
      data: { name, unit, status: "GLOBAL" },
    });
    for (const v of variants) {
      await prisma.ingredientVariant.create({
        data: {
          name: v.name,
          isDefault: v.isDefault,
          calories: v.cal,
          protein: v.protein,
          carbs: v.carbs,
          fat: v.fat,
          fiber: v.fiber,
          weightFactor: v.wf ?? 1.0,
          ingredientId: i.id,
        },
      });
    }
    for (const c of conversions) {
      await prisma.unitConversion.upsert({
        where: {
          ingredientId_unitName: { ingredientId: i.id, unitName: c.unitName },
        },
        create: {
          unitName: c.unitName,
          gramsPerUnit: c.gramsPerUnit,
          ingredientId: i.id,
        },
        update: {},
      });
    }
    console.log(`  ✓ Creado ingrediente: ${name}`);
  }
  return i.id;
}

async function main() {
  console.log("🔍 Buscando usuario admin...");
  const admin = await prisma.user.findFirst({
    where: { email: "admin@admin.com" },
  });
  if (!admin) throw new Error("No se encontró el usuario admin@admin.com");
  const adminId = admin.id;
  console.log(`✓ Admin id: ${adminId}`);

  // =========================================================
  // 1. CREAR INGREDIENTES BÁSICOS FALTANTES
  // =========================================================
  console.log("\n📦 Creando ingredientes esenciales faltantes...");

  const idAjo = await ensureIngredient(
    "Ajo",
    "g",
    [
      {
        name: "Crudo",
        isDefault: true,
        cal: 149,
        protein: 6.4,
        carbs: 33,
        fat: 0.5,
        fiber: 2.1,
      },
    ],
    [
      { unitName: "diente", gramsPerUnit: 5 },
      { unitName: "cabeza", gramsPerUnit: 40 },
    ],
  );
  const idCebolla = await ensureIngredient(
    "Cebolla",
    "g",
    [
      {
        name: "Cruda",
        isDefault: true,
        cal: 40,
        protein: 1.1,
        carbs: 9.3,
        fat: 0.1,
        fiber: 1.7,
      },
      {
        name: "Pochada",
        isDefault: false,
        cal: 72,
        protein: 1.5,
        carbs: 15,
        fat: 0.8,
        fiber: 1.5,
        wf: 0.7,
      },
    ],
    [
      { unitName: "cebolla mediana", gramsPerUnit: 150 },
      { unitName: "cebolla pequeña", gramsPerUnit: 80 },
    ],
  );
  const idPatata = await ensureIngredient(
    "Patata",
    "g",
    [
      {
        name: "Cruda",
        isDefault: true,
        cal: 77,
        protein: 2.0,
        carbs: 17.5,
        fat: 0.1,
        fiber: 2.2,
      },
      {
        name: "Cocida",
        isDefault: false,
        cal: 87,
        protein: 1.9,
        carbs: 20,
        fat: 0.1,
        fiber: 1.8,
        wf: 0.9,
      },
      {
        name: "Frita",
        isDefault: false,
        cal: 312,
        protein: 3.4,
        carbs: 41,
        fat: 15,
        fiber: 3.8,
        wf: 0.6,
      },
      {
        name: "Al horno",
        isDefault: false,
        cal: 93,
        protein: 2.5,
        carbs: 21,
        fat: 0.1,
        fiber: 2.4,
        wf: 0.8,
      },
    ],
    [
      { unitName: "patata mediana", gramsPerUnit: 200 },
      { unitName: "patata pequeña", gramsPerUnit: 100 },
    ],
  );
  const idZanahoria = await ensureIngredient(
    "Zanahoria",
    "g",
    [
      {
        name: "Cruda",
        isDefault: true,
        cal: 41,
        protein: 0.9,
        carbs: 9.6,
        fat: 0.2,
        fiber: 2.8,
      },
      {
        name: "Cocida",
        isDefault: false,
        cal: 35,
        protein: 0.8,
        carbs: 8.2,
        fat: 0.2,
        fiber: 3.0,
        wf: 0.9,
      },
    ],
    [{ unitName: "zanahoria mediana", gramsPerUnit: 100 }],
  );
  const idTomate = await ensureIngredient(
    "Tomate",
    "g",
    [
      {
        name: "Crudo",
        isDefault: true,
        cal: 18,
        protein: 0.9,
        carbs: 3.9,
        fat: 0.2,
        fiber: 1.2,
      },
      {
        name: "Asado",
        isDefault: false,
        cal: 35,
        protein: 1.5,
        carbs: 7,
        fat: 0.3,
        fiber: 2.0,
        wf: 0.7,
      },
    ],
    [
      { unitName: "tomate mediano", gramsPerUnit: 150 },
      { unitName: "tomate grande", gramsPerUnit: 250 },
    ],
  );
  const idAceiteOliva = await ensureIngredient(
    "Aceite de oliva virgen extra",
    "ml",
    [
      {
        name: "Puro",
        isDefault: true,
        cal: 884,
        protein: 0,
        carbs: 0,
        fat: 100,
        fiber: 0,
      },
    ],
    [
      { unitName: "cucharada", gramsPerUnit: 15 },
      { unitName: "cucharadita", gramsPerUnit: 5 },
    ],
  );
  const idApio = await ensureIngredient(
    "Apio",
    "g",
    [
      {
        name: "Crudo",
        isDefault: true,
        cal: 16,
        protein: 0.7,
        carbs: 3.0,
        fat: 0.2,
        fiber: 1.6,
      },
    ],
    [{ unitName: "rama", gramsPerUnit: 50 }],
  );
  const idLimón = await ensureIngredient(
    "Limón",
    "g",
    [
      {
        name: "Fresco",
        isDefault: true,
        cal: 29,
        protein: 1.1,
        carbs: 9.3,
        fat: 0.3,
        fiber: 2.8,
      },
    ],
    [{ unitName: "limón mediano", gramsPerUnit: 80 }],
  );

  console.log("\n✅ Ingredientes básicos listos");

  // =========================================================
  // 2. RECUPERAR IDs DE INGREDIENTES NECESARIOS
  // =========================================================
  console.log("\n🔎 Cargando IDs de ingredientes...");

  const ids: Record<string, number | null> = {
    // Recién creados
    ajo: idAjo,
    cebolla: idCebolla,
    patata: idPatata,
    zanahoria: idZanahoria,
    tomate: idTomate,
    aceiteOliva: idAceiteOliva,
    apio: idApio,
    limon: idLimón,
    // Carnes
    carrilleras: await ing("Carrilleras de ternera"),
    pechugarPollo: await ing("Pechuga de pollo"),
    musloPollo: await ing("Muslo de pollo"),
    carnePickadaTernera: await ing("Carne picada de ternera"),
    carnePickadaMixta: await ing("Carne picada mixta"),
    solomilloCerdo: await ing("Solomillo de cerdo"),
    // Pescados
    salmon: await ing("Salmón"),
    merluza: await ing("Merluza"),
    almejas: await ing("Almejas"),
    gambas: await ing("Gambas"),
    mejillones: await ing("Mejillones"),
    atun: await ing("Atún en lata en aceite de oliva"),
    // Verduras
    espinacas: await ing("Espinacas"),
    champiñon: await ing("Champiñón"),
    pimientoRojo: await ing("Pimiento rojo"),
    pimientoVerde: await ing("Pimiento verde"),
    calabacin: await ing("Calabacín"),
    brócoli: await ing("Brócoli"),
    lechugaromana: await ing("Lechuga romana"),
    tomateCherry: await ing("Tomate cherry"),
    tomatePera: await ing("Tomate pera"),
    puerro: await ing("Puerro"),
    pepino: await ing("Pepino"),
    cebollaMorada: await ing("Cebolla morada"),
    aguacate: await ing("Aguacate"),
    // Lácteos / huevos / embutidos
    huevo: await ing("Huevo"),
    lecheEntera: await ing("Leche entera"),
    mantequilla: await ing("Mantequilla"),
    nata: await ing("Nata para cocinar (18%)"),
    parmesano: await ing("Queso parmesano"),
    manchego: await ing("Queso manchego"),
    mozzarella: await ing("Queso mozzarella"),
    yogurNatural: await ing("Yogur natural"),
    queso_crema: await ing("Queso crema"),
    bacon: await ing("Bacón"),
    chorizo: await ing("Chorizo"),
    // Cereales / legumbres
    arrozRedondo: await ing("Arroz redondo"),
    arrozIntegral: await ing("Arroz integral"),
    arrozBasmati: await ing("Arroz basmati"),
    arrozLargo: await ing("Arroz largo"),
    spaghetti: await ing("Spaghetti"),
    macarrones: await ing("Macarrones"),
    penne: await ing("Penne rigate"),
    fusilli: await ing("Fusilli"),
    fideos: await ing("Fideos"),
    lentejas: await ing("Lentejas pardinas"),
    garbanzos: await ing("Garbanzos"),
    harina: await ing("Harina de trigo"),
    panRallado: await ing("Pan rallado"),
    azucar: await ing("Azúcar blanco"),
    canela: await ing("Canela molida"),
    quinoa: await ing("Quinoa"),
    caldoPollo: await ing("Caldo de pollo (brick)"),
    tomateTriturado: await ing("Tomate triturado"),
    tomateFrito: await ing("Tomate frito"),
    // Cotidianos
    vinoTinto: await ing("Vino tinto"),
    vinoBlanco: await ing("Vino blanco"),
    aceiteGirasol: await ing("Aceite de girasol"),
    panMolde: await ing("Pan de molde blanco"),
    panHamburguesa: await ing("Pan de hamburguesa"),
    guisantesBrick: await ing("Guisantes en lata"),
    aceitunas: await ing("Aceitunas verdes (sin hueso)"),
    salsaBrava: await ing("Salsa brava"),
    vinagre: await ing("Vinagre de vino blanco"),
    levadura: await ing("Harina de trigo"), // re-use harina if levadura not available
  };

  // Helper: solo IDs válidos (no null)
  function ri(id: number | null): number {
    if (!id) throw new Error(`Ingrediente no encontrado`);
    return id;
  }

  // =========================================================
  // 3. CREAR 30 RECETAS
  // =========================================================
  console.log("\n🍳 Creando recetas...");

  const recetas: {
    title: string;
    description: string;
    instructions: string;
    cookTime: number;
    difficulty: string;
    servings: number;
    ingredients: { id: number | null; qty: number; unit: string }[];
    components?: {
      name: string;
      isOptional?: boolean;
      options: {
        name: string;
        isDefault?: boolean;
        ingredientId: number | null;
        qty: number;
        unit: string;
      }[];
    }[];
  }[] = [
    // ─── 1. CARRILLERAS AL VINO TINTO ───────────────────────────
    {
      title: "Carrilleras al vino tinto",
      description:
        "Una de las recetas más sabrosas de la cocina española. Las carrilleras cocinadas a fuego lento con vino tinto quedan tiernas y melosas.",
      instructions:
        "1. Salpimenta las carrilleras y dóralas en aceite caliente hasta sellarlas.\n2. En la misma olla, pocha cebolla, ajo y zanahoria durante 10 minutos.\n3. Añade las carrilleras, el vino tinto y caldo hasta cubrir.\n4. Cocina a fuego lento durante 2 horas o en olla exprés 45 minutos.\n5. Retira las carrilleras, tritura la salsa y vuelve a juntar.\n6. Sirve con la guarnición de tu elección.",
      cookTime: 120,
      difficulty: "media",
      servings: 4,
      ingredients: [
        { id: ids.carrilleras, qty: 800, unit: "g" },
        { id: ids.vinoTinto, qty: 300, unit: "ml" },
        { id: ids.cebolla, qty: 2, unit: "ud" },
        { id: ids.ajo, qty: 4, unit: "diente" },
        { id: ids.zanahoria, qty: 2, unit: "ud" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 2. SOPA DE FIDEOS ──────────────────────────────────────
    {
      title: "Sopa de fideos",
      description:
        "La sopa clásica de la abuela. Reconfortante, sencilla y perfecta para el frío.",
      instructions:
        "1. Sofríe la zanahoria y el puerro en aceite durante 5 minutos.\n2. Añade el caldo de pollo y lleva a ebullición.\n3. Incorpora los fideos y cocina según las instrucciones del paquete.\n4. Rectifica de sal y sirve caliente.",
      cookTime: 25,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.fideos, qty: 150, unit: "g" },
        { id: ids.caldoPollo, qty: 1500, unit: "ml" },
        { id: ids.zanahoria, qty: 2, unit: "ud" },
        { id: ids.puerro, qty: 1, unit: "ud" },
        { id: ids.aceiteOliva, qty: 2, unit: "cucharada" },
      ],
    },
    // ─── 3. SOPA DE VERDURAS ────────────────────────────────────
    {
      title: "Sopa de verduras",
      description:
        "Sopa de verduras de temporada, nutritiva y ligera. Perfecta para una cena saludable.",
      instructions:
        "1. Trocea todas las verduras en cubos similares.\n2. Sofríe la cebolla y el ajo en aceite durante 5 minutos.\n3. Añade el resto de verduras y rehoga 5 minutos más.\n4. Cubre con agua o caldo y cocina 25 minutos.\n5. Sala al gusto y sirve.",
      cookTime: 40,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.calabacin, qty: 2, unit: "ud" },
        { id: ids.zanahoria, qty: 2, unit: "ud" },
        { id: ids.patata, qty: 2, unit: "ud" },
        { id: ids.puerro, qty: 1, unit: "ud" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.ajo, qty: 2, unit: "diente" },
        { id: ids.aceiteOliva, qty: 2, unit: "cucharada" },
      ],
    },
    // ─── 4. PASTA CARBONARA ─────────────────────────────────────
    {
      title: "Pasta carbonara",
      description:
        "La auténtica carbonara italiana: sin nata, solo huevo, parmesano, bacón y pimienta negra.",
      instructions:
        "1. Cuece la pasta en agua con sal.\n2. Dora el bacón en trozos en una sartén sin aceite.\n3. Mezcla huevos con parmesano rallado y pimienta negra.\n4. Escurre la pasta reservando un poco de agua de cocción.\n5. Fuera del fuego, mezcla la pasta caliente con el bacón, luego añade la mezcla de huevo.\n6. Añade agua de cocción si queda seca. Sirve inmediatamente.",
      cookTime: 20,
      difficulty: "media",
      servings: 2,
      ingredients: [
        { id: ids.spaghetti, qty: 160, unit: "g" },
        { id: ids.bacon, qty: 120, unit: "g" },
        { id: ids.huevo, qty: 2, unit: "ud" },
        { id: ids.parmesano, qty: 60, unit: "g" },
      ],
    },
    // ─── 5. PASTA BOLOÑESA ──────────────────────────────────────
    {
      title: "Pasta a la boloñesa",
      description:
        "Clásica salsa de carne italiana cocinada despacio para concentrar todos los sabores.",
      instructions:
        "1. Sofríe cebolla, ajo y zanahoria en aceite hasta que estén blandos.\n2. Añade la carne picada, sube el fuego y dora bien.\n3. Agrega el tomate triturado, sazona y deja cocinar 30 minutos a fuego lento.\n4. Cuece la pasta en agua con sal y escurre.\n5. Mezcla con la salsa y sirve con parmesano rallado.",
      cookTime: 50,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.macarrones, qty: 320, unit: "g" },
        { id: ids.carnePickadaTernera, qty: 500, unit: "g" },
        { id: ids.tomateTriturado, qty: 400, unit: "g" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.ajo, qty: 3, unit: "diente" },
        { id: ids.zanahoria, qty: 1, unit: "ud" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 6. TORTILLA ESPAÑOLA ───────────────────────────────────
    {
      title: "Tortilla española",
      description:
        "El plato más icónico de la gastronomía española. Con patata y cebolla, jugosa por dentro.",
      instructions:
        "1. Pela y corta las patatas en láminas finas. Corta la cebolla en juliana.\n2. Fríe patatas y cebolla en aceite abundante a fuego medio-bajo durante 20 minutos hasta que estén blandas. Escurre bien el aceite.\n3. Bate los huevos, añade sal, agrega patatas y cebolla y mezcla.\n4. En sartén antiadherente con poco aceite, cuaja la tortilla por ambos lados.\n5. Sirve caliente o a temperatura ambiente.",
      cookTime: 40,
      difficulty: "media",
      servings: 4,
      ingredients: [
        { id: ids.huevo, qty: 6, unit: "ud" },
        { id: ids.patata, qty: 500, unit: "g" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.aceiteGirasol, qty: 200, unit: "ml" },
      ],
    },
    // ─── 7. POLLO AL HORNO CON PATATAS ──────────────────────────
    {
      title: "Pollo al horno con patatas",
      description:
        "Receta de domingo: muslos de pollo crujientes por fuera, jugosos por dentro, sobre cama de patatas asadas.",
      instructions:
        "1. Precalienta el horno a 200°C.\n2. Pela y trocea las patatas, ponlas en la bandeja con aceite, sal y ajo.\n3. Coloca los muslos de pollo encima, salpimenta y añade un chorro de aceite.\n4. Hornea 45-50 minutos, dando la vuelta al pollo a mitad de cocción.\n5. Los últimos 10 minutos pon el grill para que la piel quede crujiente.",
      cookTime: 60,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.musloPollo, qty: 800, unit: "g" },
        { id: ids.patata, qty: 600, unit: "g" },
        { id: ids.ajo, qty: 6, unit: "diente" },
        { id: ids.aceiteOliva, qty: 4, unit: "cucharada" },
      ],
    },
    // ─── 8. SALMÓN AL HORNO ─────────────────────────────────────
    {
      title: "Salmón al horno con tomate cherry",
      description:
        "Salmón fresco al horno sobre cama de tomates cherry caramelizados. Rápido, healthy y delicioso.",
      instructions:
        "1. Precalienta el horno a 180°C.\n2. Coloca los tomates cherry en la bandeja con ajo, aceite y sal.\n3. Coloca el salmón encima, añade unas gotas de limón y un hilo de aceite.\n4. Hornea 15-18 minutos según el grosor del lomo.\n5. Sirve inmediatamente con los tomates confitados.",
      cookTime: 25,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.salmon, qty: 400, unit: "g" },
        { id: ids.tomateCherry, qty: 250, unit: "g" },
        { id: ids.ajo, qty: 3, unit: "diente" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
        { id: ids.limon, qty: 1, unit: "ud" },
      ],
    },
    // ─── 9. MERLUZA A LA VASCA ──────────────────────────────────
    {
      title: "Merluza a la vasca",
      description:
        "Merluza cocinada en salsa verde con almejas y guisantes. Un clásico del País Vasco.",
      instructions:
        "1. Sazona los lomos de merluza y pásalos por harina.\n2. Dóralos en aceite de oliva 2 minutos por cada lado, reserva.\n3. En la misma cazuela, sofríe ajo picado, añade perejil, vino blanco y caldo.\n4. Agrega las almejas y los guisantes, incorpora la merluza.\n5. Cocina 5-7 minutos moviendo la cazuela para que ligue la salsa.\n6. Sirve inmediatamente.",
      cookTime: 30,
      difficulty: "media",
      servings: 4,
      ingredients: [
        { id: ids.merluza, qty: 800, unit: "g" },
        { id: ids.almejas, qty: 300, unit: "g" },
        { id: ids.guisantesBrick, qty: 150, unit: "g" },
        { id: ids.ajo, qty: 4, unit: "diente" },
        { id: ids.vinoBlanco, qty: 100, unit: "ml" },
        { id: ids.harina, qty: 30, unit: "g" },
        { id: ids.aceiteOliva, qty: 4, unit: "cucharada" },
      ],
    },
    // ─── 10. LENTEJAS ESTOFADAS ─────────────────────────────────
    {
      title: "Lentejas estofadas con chorizo",
      description:
        "Las lentejas de cuchara tradicionales, con chorizo y verduras. Perfectas para el invierno.",
      instructions:
        "1. Sofríe cebolla, ajo, zanahoria y pimiento rojo picados en aceite.\n2. Añade el chorizo en rodajas y rehoga 3 minutos.\n3. Incorpora las lentejas (sin remojar), añade agua o caldo hasta cubrir 3 dedos.\n4. Cocina a fuego medio-bajo 35-45 minutos hasta que estén tiernas.\n5. Ajusta de sal y consistencia añadiendo agua si fuera necesario.",
      cookTime: 60,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.lentejas, qty: 400, unit: "g" },
        { id: ids.chorizo, qty: 150, unit: "g" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.ajo, qty: 3, unit: "diente" },
        { id: ids.zanahoria, qty: 2, unit: "ud" },
        { id: ids.pimientoRojo, qty: 1, unit: "ud" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 11. GARBANZOS CON ESPINACAS ────────────────────────────
    {
      title: "Garbanzos con espinacas",
      description:
        "Plato vegetariano andaluz rico en proteína vegetal y hierro. Rápido y reconfortante.",
      instructions:
        "1. Sofríe ajo laminado en aceite hasta que tome color dorado.\n2. Añade el tomate frito y rehoga 3 minutos.\n3. Incorpora los garbanzos cocidos escurridos y mezcla bien.\n4. Agrega las espinacas lavadas y cocina hasta que se marchiten (3-4 min).\n5. Ajusta sal y sirve con pan para mojar.",
      cookTime: 20,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.garbanzos, qty: 400, unit: "g" },
        { id: ids.espinacas, qty: 300, unit: "g" },
        { id: ids.ajo, qty: 4, unit: "diente" },
        { id: ids.tomateFrito, qty: 200, unit: "g" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 12. PURÉ DE PATATAS ────────────────────────────────────
    {
      title: "Puré de patatas casero",
      description:
        "El puré de patatas perfecto: cremoso, suave y con ese toque de mantequilla que lo hace irresistible.",
      instructions:
        "1. Pela y corta las patatas en trozos. Cuécelas en agua con sal durante 20 minutos.\n2. Escurre y aplasta con un pasapurés o tenedor.\n3. Añade la mantequilla y mezcla bien.\n4. Incorpora la leche caliente poco a poco hasta conseguir la textura deseada.\n5. Ajusta de sal y sirve caliente.",
      cookTime: 30,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.patata, qty: 800, unit: "g" },
        { id: ids.mantequilla, qty: 60, unit: "g" },
        { id: ids.lecheEntera, qty: 150, unit: "ml" },
      ],
    },
    // ─── 13. ENSALADA MIXTA ─────────────────────────────────────
    {
      title: "Ensalada mixta con atún",
      description:
        "La ensalada de toda la vida, fresca y completa. Con lechuga, tomate, cebolla morada, aceitunas y atún.",
      instructions:
        "1. Lava y trocea la lechuga.\n2. Corta los tomates cherry por la mitad y la cebolla morada en aros finos.\n3. Monta la ensalada: lechuga, tomate, cebolla, aceitunas y el atún escurrido.\n4. Aliña con aceite de oliva, vinagre y sal.\n5. Sirve inmediatamente.",
      cookTime: 10,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.lechugaromana, qty: 200, unit: "g" },
        { id: ids.tomateCherry, qty: 150, unit: "g" },
        { id: ids.cebollaMorada, qty: 1, unit: "ud" },
        { id: ids.aceitunas, qty: 80, unit: "g" },
        { id: ids.atun, qty: 160, unit: "g" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
        { id: ids.vinagre, qty: 1, unit: "cucharada" },
      ],
    },
    // ─── 14. GAZPACHO ───────────────────────────────────────────
    {
      title: "Gazpacho andaluz",
      description:
        "La sopa fría más refrescante del verano. Hecho con tomates maduros, pimiento y pepino.",
      instructions:
        "1. Trocea todos los vegetales groseramente.\n2. Tritura en batidora potente con aceite y vinagre hasta obtener una crema fina.\n3. Pasa por el chino si quieres textura más fina.\n4. Ajusta sal y vinagre. Refrigera al menos 2 horas.\n5. Sirve muy frío con tropezones de tomate, pepino y pan frito.",
      cookTime: 15,
      difficulty: "fácil",
      servings: 6,
      ingredients: [
        { id: ids.tomatePera, qty: 1000, unit: "g" },
        { id: ids.pimientoVerde, qty: 1, unit: "ud" },
        { id: ids.pepino, qty: 1, unit: "ud" },
        { id: ids.ajo, qty: 1, unit: "diente" },
        { id: ids.aceiteOliva, qty: 80, unit: "ml" },
        { id: ids.vinagre, qty: 30, unit: "ml" },
        { id: ids.panMolde, qty: 50, unit: "g" },
      ],
    },
    // ─── 15. PISTO MANCHEGO ─────────────────────────────────────
    {
      title: "Pisto manchego",
      description:
        "El pisto es el ratatouille español: un guiso de verduras de temporada lentas a fuego muy suave.",
      instructions:
        "1. Corta todas las verduras en dados de tamaño similar.\n2. Sofríe la cebolla y el ajo en abundante aceite durante 10 minutos.\n3. Añade el pimiento y cocina 10 minutos más.\n4. Incorpora el calabacín y cocina 15 minutos.\n5. Agrega el tomate triturado, sal y azúcar. Cocina 20 minutos a fuego lento.\n6. Sirve caliente o a temperatura ambiente con huevo frito encima si deseas.",
      cookTime: 60,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.calabacin, qty: 2, unit: "ud" },
        { id: ids.pimientoRojo, qty: 2, unit: "ud" },
        { id: ids.pimientoVerde, qty: 1, unit: "ud" },
        { id: ids.tomateTriturado, qty: 400, unit: "g" },
        { id: ids.cebolla, qty: 2, unit: "ud" },
        { id: ids.ajo, qty: 3, unit: "diente" },
        { id: ids.aceiteOliva, qty: 5, unit: "cucharada" },
      ],
    },
    // ─── 16. CREMA DE CALABACÍN ─────────────────────────────────
    {
      title: "Crema de calabacín",
      description:
        "Crema suave, ligera y con un toque de nata. Perfecta como entrante o cena ligera.",
      instructions:
        "1. Sofríe la cebolla y el ajo en aceite hasta que estén blandos.\n2. Añade el calabacín troceado y rehoga 5 minutos.\n3. Cubre con caldo y cocina 20 minutos.\n4. Tritura hasta obtener una crema fina.\n5. Añade la nata, ajusta de sal y sirve caliente con picatostes.",
      cookTime: 35,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.calabacin, qty: 3, unit: "ud" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.nata, qty: 100, unit: "ml" },
        { id: ids.caldoPollo, qty: 600, unit: "ml" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 17. PATATAS BRAVAS ─────────────────────────────────────
    {
      title: "Patatas bravas",
      description:
        "El aperitivo español por excelencia. Patatas fritas con salsa brava casera.",
      instructions:
        "1. Pela y corta las patatas en dados irregulares de 3-4 cm.\n2. Fríelas en aceite a 160°C durante 8 minutos (primera fritura).\n3. Escurre y sube el aceite a 190°C. Fríe 3-4 minutos más hasta doradas.\n4. Escurre sobre papel, sala y sirve inmediatamente con salsa brava.",
      cookTime: 25,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.patata, qty: 500, unit: "g" },
        { id: ids.aceiteGirasol, qty: 500, unit: "ml" },
        { id: ids.salsaBrava, qty: 100, unit: "g" },
      ],
    },
    // ─── 18. ALBÓNDIGAS EN SALSA ────────────────────────────────
    {
      title: "Albóndigas en salsa de tomate",
      description:
        "Albóndigas caseras jugosas bañadas en una salsa de tomate casera. Clásico reconfortante.",
      instructions:
        "1. Mezcla la carne picada con huevo, pan rallado, ajo, sal y pimienta. Forma las albóndigas.\n2. Pásalas por harina y fríelas en aceite hasta dorarlas. Reserva.\n3. En la misma sartén, sofríe cebolla y ajo. Añade tomate triturado, azúcar, sal y cocina 20 min.\n4. Incorpora las albóndigas a la salsa y cocina 15 minutos más a fuego lento.\n5. Sirve con arroz o puré de patatas.",
      cookTime: 55,
      difficulty: "media",
      servings: 4,
      ingredients: [
        { id: ids.carnePickadaMixta, qty: 600, unit: "g" },
        { id: ids.huevo, qty: 1, unit: "ud" },
        { id: ids.panRallado, qty: 60, unit: "g" },
        { id: ids.tomateTriturado, qty: 500, unit: "g" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.ajo, qty: 3, unit: "diente" },
        { id: ids.harina, qty: 50, unit: "g" },
        { id: ids.aceiteOliva, qty: 5, unit: "cucharada" },
      ],
    },
    // ─── 19. CALDO DE VERDURAS ──────────────────────────────────
    {
      title: "Caldo de verduras casero",
      description:
        "Base perfecta para todas tus sopas y arroces. Lleva muy poco trabajo y se puede congelar.",
      instructions:
        "1. Trocea todas las verduras groseramente.\n2. Introdúcelas en una olla grande, cubre con 2 litros de agua fría.\n3. Lleva a ebullición, desespuma si fuera necesario.\n4. Cocina a fuego lento 45 minutos.\n5. Cuela y conserva el caldo. Congela en porciones de 500 ml.",
      cookTime: 55,
      difficulty: "fácil",
      servings: 8,
      ingredients: [
        { id: ids.puerro, qty: 2, unit: "ud" },
        { id: ids.zanahoria, qty: 3, unit: "ud" },
        { id: ids.apio, qty: 3, unit: "rama" },
        { id: ids.cebolla, qty: 2, unit: "ud" },
        { id: ids.ajo, qty: 4, unit: "diente" },
        { id: ids.aceiteOliva, qty: 2, unit: "cucharada" },
      ],
    },
    // ─── 20. ARROZ CON LECHE ────────────────────────────────────
    {
      title: "Arroz con leche",
      description:
        "El postre tradicional asturiano. Cremoso, suave y con su canela espolvoreada por encima.",
      instructions:
        "1. Pon la leche a calentar con una rama de canela.\n2. Cuando hierva, añade el arroz y el azúcar.\n3. Cocina a fuego muy lento durante 30-35 minutos, removiendo frecuentemente.\n4. Reparte en cuencos y espolvorea con canela molida.\n5. Sirve templado o frío del frigorífico.",
      cookTime: 45,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.arrozRedondo, qty: 150, unit: "g" },
        { id: ids.lecheEntera, qty: 1000, unit: "ml" },
        { id: ids.azucar, qty: 100, unit: "g" },
        { id: ids.canela, qty: 1, unit: "cucharadita" },
      ],
    },
    // ─── 21. BIZCOCHO DE YOGUR ──────────────────────────────────
    {
      title: "Bizcocho de yogur",
      description:
        "El bizcocho más sencillo del mundo. Esponjoso, húmedo y con la textura perfecta. Usa el vasito de yogur de medida.",
      instructions:
        "1. Precalienta el horno a 180°C.\n2. Mezcla el yogur, los huevos, el azúcar y el aceite hasta integrar.\n3. Tamiza la harina y la levadura e incorpora a la mezcla.\n4. Vierte en molde engrasado y hornea 35-40 minutos.\n5. Deja enfriar antes de desmoldar.",
      cookTime: 50,
      difficulty: "fácil",
      servings: 8,
      ingredients: [
        { id: ids.yogurNatural, qty: 125, unit: "g" },
        { id: ids.harina, qty: 250, unit: "g" },
        { id: ids.huevo, qty: 3, unit: "ud" },
        { id: ids.azucar, qty: 190, unit: "g" },
        { id: ids.aceiteGirasol, qty: 125, unit: "ml" },
      ],
    },
    // ─── 22. TOSTADAS CON AGUACATE ──────────────────────────────
    {
      title: "Tostadas con aguacate y huevo",
      description:
        "El desayuno o brunch más popular. Aguacate cremoso sobre tostada con huevo poché y tomate.",
      instructions:
        "1. Tuesta el pan.\n2. Aplasta el aguacate con un tenedor, añade sal y unas gotas de limón.\n3. Pocha el huevo en agua con vinagre durante 3-4 minutos.\n4. Unta el aguacate en la tostada, coloca el huevo encima y decora con tomate cherry.\n5. Sirve inmediatamente.",
      cookTime: 10,
      difficulty: "fácil",
      servings: 1,
      ingredients: [
        { id: ids.panMolde, qty: 2, unit: "ud" },
        { id: ids.aguacate, qty: 1, unit: "ud" },
        { id: ids.huevo, qty: 1, unit: "ud" },
        { id: ids.tomateCherry, qty: 80, unit: "g" },
      ],
    },
    // ─── 23. SOLOMILLO DE CERDO CON CHAMPIÑONES ─────────────────
    {
      title: "Solomillo de cerdo con salsa de champiñones",
      description:
        "Solomillo tierno y jugoso con una salsa de champiñones y nata que engancha desde la primera cucharada.",
      instructions:
        "1. Sella el solomillo entero en aceite caliente por todos los lados.\n2. Retira y reserva. En la misma sartén, sofríe cebolla picada y los champiñones laminados.\n3. Añade el vino blanco, deja reducir 2 minutos.\n4. Incorpora la nata, sazona y cocina 5 minutos.\n5. Vuelve a poner el solomillo, cubre y cocina 10 minutos más.\n6. Corta en medallones y sirve con la salsa por encima.",
      cookTime: 35,
      difficulty: "media",
      servings: 3,
      ingredients: [
        { id: ids.solomilloCerdo, qty: 500, unit: "g" },
        { id: ids.champiñon, qty: 300, unit: "g" },
        { id: ids.nata, qty: 200, unit: "ml" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.vinoBlanco, qty: 100, unit: "ml" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 24. HAMBURGUESA CASERA ─────────────────────────────────
    {
      title: "Hamburguesa casera",
      description:
        "La hamburguesa perfecta hecha en casa: jugosa, con queso manchego fundido y todos los tropezones.",
      instructions:
        "1. Amasa la carne picada con sal y pimienta, forma las hamburguesas.\n2. Cocínalas a la plancha o parrilla 3-4 minutos por cada lado.\n3. Añade el queso manchego en lonchas los últimos 2 minutos y tapa para fundir.\n4. Tuesta el pan de hamburguesa.\n5. Monta la hamburguesa con lechuga, tomate cherry cortado y la carne.",
      cookTime: 20,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.carnePickadaTernera, qty: 300, unit: "g" },
        { id: ids.panHamburguesa, qty: 2, unit: "ud" },
        { id: ids.lechugaromana, qty: 60, unit: "g" },
        { id: ids.tomateCherry, qty: 100, unit: "g" },
        { id: ids.manchego, qty: 60, unit: "g" },
      ],
    },
    // ─── 25. HUEVOS REVUELTOS CON CHAMPIÑONES ───────────────────
    {
      title: "Huevos revueltos con champiñones",
      description:
        "Unos huevos revueltos cremosos con champiñones salteados. Cena rápida y nutritiva.",
      instructions:
        "1. Saltea los champiñones laminados con ajo en mantequilla hasta que evapore el agua.\n2. Bate los huevos ligeramente, añade sal.\n3. A fuego muy bajo, vierte los huevos sobre los champiñones.\n4. Remueve constantemente con espátula hasta que cuajen pero estén cremosos.\n5. Sirve sobre tostadas.",
      cookTime: 12,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.huevo, qty: 4, unit: "ud" },
        { id: ids.champiñon, qty: 200, unit: "g" },
        { id: ids.mantequilla, qty: 30, unit: "g" },
        { id: ids.ajo, qty: 1, unit: "diente" },
      ],
    },
    // ─── 26. ENSALADA GRIEGA ────────────────────────────────────
    {
      title: "Ensalada griega",
      description:
        "La ensalada mediterránea por excelencia: tomate, pepino, cebolla morada, aceitunas y queso feta.",
      instructions:
        "1. Corta el tomate pera en gajos y el pepino en medias lunas.\n2. Lamina la cebolla morada en aros muy finos.\n3. Monta la ensalada con todos los ingredientes, colocando el queso feta en trozos encima.\n4. Aliña con aceite de oliva, orégano y sal.\n5. Sirve inmediatamente.",
      cookTime: 10,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.tomatePera, qty: 2, unit: "ud" },
        { id: ids.pepino, qty: 1, unit: "ud" },
        { id: ids.cebollaMorada, qty: 1, unit: "ud" },
        { id: ids.aceitunas, qty: 80, unit: "g" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 27. BRÓCOLI AL VAPOR CON AJO ───────────────────────────
    {
      title: "Brócoli al vapor con ajo y limón",
      description:
        "Guarnición saludable y llena de color. El brócoli al vapor mantiene todos sus nutrientes.",
      instructions:
        "1. Corta el brócoli en ramilletes de tamaño similar.\n2. Cocina al vapor durante 5-7 minutos (debe quedar al dente y verde brillante).\n3. En sartén, dora el ajo laminado en aceite de oliva.\n4. Vierte el aceite con ajo sobre el brócoli.\n5. Añade unas gotas de limón y sirve caliente.",
      cookTime: 15,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.brócoli, qty: 400, unit: "g" },
        { id: ids.ajo, qty: 3, unit: "diente" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
        { id: ids.limon, qty: 1, unit: "ud" },
      ],
    },
    // ─── 28. PECHUGA DE POLLO AL LIMÓN ──────────────────────────
    {
      title: "Pechuga de pollo al limón",
      description:
        "Pechuga de pollo jugosa marinada en limón y ajo. Lista en 20 minutos, perfecta para el día a día.",
      instructions:
        "1. Marina las pechugas con zumo de limón, ajo machacado, aceite, sal y pimienta durante 30 min.\n2. Cocina a la plancha o en sartén antiadherente caliente 4-5 minutos por lado.\n3. Añade el resto de la marinada a la sartén los últimos 2 minutos.\n4. Deja reposar 2 minutos antes de servir.\n5. Acompaña con la guarnición de tu elección.",
      cookTime: 20,
      difficulty: "fácil",
      servings: 2,
      ingredients: [
        { id: ids.pechugarPollo, qty: 400, unit: "g" },
        { id: ids.limon, qty: 2, unit: "ud" },
        { id: ids.ajo, qty: 2, unit: "diente" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
    },
    // ─── 29. QUICHE DE VERDURAS ─────────────────────────────────
    {
      title: "Quiche de champiñones y espinacas",
      description:
        "Quiche cremosa sin masa para unas recetas más ligeras. Rellena de champiñones, espinacas y queso.",
      instructions:
        "1. Sofríe los champiñones y las espinacas en aceite con ajo hasta eliminar el agua.\n2. Bate los huevos con la nata, sal, pimienta y el queso parmesano rallado.\n3. Mezcla con las verduras.\n4. Vierte en molde engrasado y hornea a 180°C durante 30-35 minutos.\n5. Deja reposar 10 minutos antes de desmoldar.",
      cookTime: 50,
      difficulty: "media",
      servings: 6,
      ingredients: [
        { id: ids.huevo, qty: 4, unit: "ud" },
        { id: ids.nata, qty: 200, unit: "ml" },
        { id: ids.champiñon, qty: 250, unit: "g" },
        { id: ids.espinacas, qty: 150, unit: "g" },
        { id: ids.parmesano, qty: 60, unit: "g" },
        { id: ids.ajo, qty: 2, unit: "diente" },
        { id: ids.aceiteOliva, qty: 2, unit: "cucharada" },
      ],
    },
    // ─── 30 MOVED TO AFTER ──────────────────────────────────────
    // ─── RECETAS CON COMPONENTES/VARIANTES ──────────────────────
    // ─── C1. CARRILLERAS CON GUARNICIÓN ─────────────────────────
    {
      title: "Carrilleras con guarnición a elegir",
      description:
        "Las clásicas carrilleras al vino tinto con la guarnición que prefieras: arroz, patatas o verduras salteadas.",
      instructions:
        "1. Sella las carrilleras en aceite muy caliente por todos los lados.\n2. Sofríe cebolla y ajo hasta que estén dorados.\n3. Añade el vino tinto, deja reducir 5 minutos.\n4. Cubre con agua o caldo, cocina 1h30 a fuego lento con tapa.\n5. Retira las carrilleras, tritura la salsa y reduce si fuera necesario.\n6. Prepara la guarnición elegida y sirve junto a las carrilleras.",
      cookTime: 110,
      difficulty: "media",
      servings: 4,
      ingredients: [
        { id: ids.carrilleras, qty: 800, unit: "g" },
        { id: ids.vinoTinto, qty: 250, unit: "ml" },
        { id: ids.cebolla, qty: 2, unit: "ud" },
        { id: ids.ajo, qty: 4, unit: "diente" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
      components: [
        {
          name: "Guarnición",
          options: [
            {
              name: "Arroz blanco",
              isDefault: true,
              ingredientId: ids.arrozRedondo,
              qty: 80,
              unit: "g",
            },
            {
              name: "Arroz integral",
              isDefault: false,
              ingredientId: ids.arrozIntegral,
              qty: 80,
              unit: "g",
            },
            {
              name: "Arroz basmati",
              isDefault: false,
              ingredientId: ids.arrozBasmati,
              qty: 80,
              unit: "g",
            },
            {
              name: "Puré de patatas",
              isDefault: false,
              ingredientId: ids.patata,
              qty: 200,
              unit: "g",
            },
          ],
        },
      ],
    },
    // ─── C2. PASTA A TU GUSTO ───────────────────────────────────
    {
      title: "Pasta a tu gusto con boloñesa",
      description:
        "La clásica salsa boloñesa con el tipo de pasta que prefieras. Para toda la familia.",
      instructions:
        "1. Sofríe cebolla y ajo. Añade carne picada y dora bien.\n2. Agrega el tomate triturado, salt y cocina 30 minutos a fuego lento.\n3. Cuece el tipo de pasta elegido en agua con sal según el pack.\n4. Escurre y mezcla con la salsa.\n5. Sirve con parmesano recién rallado.",
      cookTime: 45,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.carnePickadaTernera, qty: 500, unit: "g" },
        { id: ids.tomateTriturado, qty: 400, unit: "g" },
        { id: ids.cebolla, qty: 1, unit: "ud" },
        { id: ids.ajo, qty: 2, unit: "diente" },
        { id: ids.parmesano, qty: 40, unit: "g" },
        { id: ids.aceiteOliva, qty: 3, unit: "cucharada" },
      ],
      components: [
        {
          name: "Tipo de pasta",
          options: [
            {
              name: "Spaghetti",
              isDefault: true,
              ingredientId: ids.spaghetti,
              qty: 320,
              unit: "g",
            },
            {
              name: "Macarrones",
              isDefault: false,
              ingredientId: ids.macarrones,
              qty: 320,
              unit: "g",
            },
            {
              name: "Penne rigate",
              isDefault: false,
              ingredientId: ids.penne,
              qty: 320,
              unit: "g",
            },
            {
              name: "Fusilli",
              isDefault: false,
              ingredientId: ids.fusilli,
              qty: 320,
              unit: "g",
            },
          ],
        },
      ],
    },
    // ─── C3. BOWL PROTEICO ──────────────────────────────────────
    {
      title: "Bowl proteico personalizable",
      description:
        "Bowl nutritivo y equilibrado: elige tu base de carbohidratos y tu fuente de proteína.",
      instructions:
        "1. Prepara la base: cuece el arroz, quinoa o pasta.\n2. Cocina la proteína elegida: a la plancha, en lata o huevo según el tipo.\n3. Prepara los vegetales: lechuga troceada y tomate cherry cortado.\n4. Monta el bowl en capas: base, proteína, vegetales.\n5. Aliña con aceite de oliva y limón.",
      cookTime: 20,
      difficulty: "fácil",
      servings: 1,
      ingredients: [
        { id: ids.lechugaromana, qty: 80, unit: "g" },
        { id: ids.tomateCherry, qty: 100, unit: "g" },
        { id: ids.aceiteOliva, qty: 2, unit: "cucharada" },
      ],
      components: [
        {
          name: "Base de carbohidratos",
          options: [
            {
              name: "Arroz blanco",
              isDefault: true,
              ingredientId: ids.arrozRedondo,
              qty: 80,
              unit: "g",
            },
            {
              name: "Arroz integral",
              isDefault: false,
              ingredientId: ids.arrozIntegral,
              qty: 80,
              unit: "g",
            },
            {
              name: "Quinoa",
              isDefault: false,
              ingredientId: ids.quinoa,
              qty: 80,
              unit: "g",
            },
            {
              name: "Pasta",
              isDefault: false,
              ingredientId: ids.fusilli,
              qty: 80,
              unit: "g",
            },
          ],
        },
        {
          name: "Proteína",
          options: [
            {
              name: "Pechuga de pollo",
              isDefault: true,
              ingredientId: ids.pechugarPollo,
              qty: 150,
              unit: "g",
            },
            {
              name: "Atún en aceite",
              isDefault: false,
              ingredientId: ids.atun,
              qty: 80,
              unit: "g",
            },
            {
              name: "Huevo cocido",
              isDefault: false,
              ingredientId: ids.huevo,
              qty: 2,
              unit: "ud",
            },
            {
              name: "Salmón",
              isDefault: false,
              ingredientId: ids.salmon,
              qty: 120,
              unit: "g",
            },
          ],
        },
      ],
    },
    // ─── C4. PAELLA DE VERDURAS CON PROTEÍNA ────────────────────
    {
      title: "Paella de verduras con proteína",
      description:
        "Paella de verduras colorida y aromática. Elige si añadir gambas, mejillones o dejarla vegetariana.",
      instructions:
        "1. Sofríe ajo y pimiento en aceite de oliva en paellera o sartén ancha.\n2. Añade el tomate triturado y pimentón.\n3. Incorpora la proteína elegida y saltea 2 minutos.\n4. Agrega el arroz, remueve para impregnar de sofrito.\n5. Vierte el caldo caliente 2.5 partes por 1 de arroz. No remuevas más.\n6. Cocina a fuego fuerte 5 min, luego medio 13 min. Deja reposar 5 min con paño.",
      cookTime: 35,
      difficulty: "alta",
      servings: 4,
      ingredients: [
        { id: ids.arrozRedondo, qty: 320, unit: "g" },
        { id: ids.pimientoRojo, qty: 1, unit: "ud" },
        { id: ids.pimientoVerde, qty: 1, unit: "ud" },
        { id: ids.guisantesBrick, qty: 150, unit: "g" },
        { id: ids.tomateTriturado, qty: 200, unit: "g" },
        { id: ids.caldoPollo, qty: 800, unit: "ml" },
        { id: ids.ajo, qty: 3, unit: "diente" },
        { id: ids.aceiteOliva, qty: 4, unit: "cucharada" },
      ],
      components: [
        {
          name: "Proteína (opcional)",
          isOptional: true,
          options: [
            {
              name: "Gambas",
              isDefault: true,
              ingredientId: ids.gambas,
              qty: 250,
              unit: "g",
            },
            {
              name: "Mejillones",
              isDefault: false,
              ingredientId: ids.mejillones,
              qty: 300,
              unit: "g",
            },
            {
              name: "Pollo",
              isDefault: false,
              ingredientId: ids.musloPollo,
              qty: 400,
              unit: "g",
            },
          ],
        },
      ],
    },
    // ─── C5. SOPA DEL DÍA ───────────────────────────────────────
    {
      title: "Sopa del día",
      description:
        "Una sopa reconfortante que puedes adaptar según lo que tengas en casa: de fideos, de verduras o más sustanciosa.",
      instructions:
        "1. Sofríe el puerro y la zanahoria en aceite durante 5 minutos.\n2. Añade el caldo y lleva a ebullición.\n3. Incorpora el ingrediente base elegido y cocina el tiempo indicado.\n4. Ajusta de sal y sirve con pan.",
      cookTime: 30,
      difficulty: "fácil",
      servings: 4,
      ingredients: [
        { id: ids.caldoPollo, qty: 1500, unit: "ml" },
        { id: ids.puerro, qty: 1, unit: "ud" },
        { id: ids.zanahoria, qty: 2, unit: "ud" },
        { id: ids.aceiteOliva, qty: 2, unit: "cucharada" },
      ],
      components: [
        {
          name: "Base de la sopa",
          options: [
            {
              name: "Fideos",
              isDefault: true,
              ingredientId: ids.fideos,
              qty: 100,
              unit: "g",
            },
            {
              name: "Arroz",
              isDefault: false,
              ingredientId: ids.arrozRedondo,
              qty: 80,
              unit: "g",
            },
            {
              name: "Brócoli",
              isDefault: false,
              ingredientId: ids.brócoli,
              qty: 200,
              unit: "g",
            },
            {
              name: "Lentejas rojas",
              isDefault: false,
              ingredientId: ids.lentejas,
              qty: 100,
              unit: "g",
            },
          ],
        },
      ],
    },
  ];

  // =========================================================
  // 4. INSERTAR LAS RECETAS EN BD
  // =========================================================
  let creadas = 0;
  for (const r of recetas) {
    // Filtrar ingredientes con ID válido
    const ingFiltered = r.ingredients.filter((i) => i.id !== null);

    const recipe = await prisma.recipe.create({
      data: {
        title: r.title,
        description: r.description,
        instructions: r.instructions,
        cookTimeMinutes: r.cookTime,
        difficulty: r.difficulty,
        servings: r.servings,
        isPublic: true,
        userId: adminId,
        ingredients: {
          create: ingFiltered.map((i) => ({
            ingredientId: i.id!,
            quantity: i.qty,
            unit: i.unit,
          })),
        },
      },
    });

    // Crear componentes si los hay
    if (r.components) {
      for (let ci = 0; ci < r.components.length; ci++) {
        const comp = r.components[ci];
        const component = await prisma.recipeComponent.create({
          data: {
            name: comp.name,
            sortOrder: ci,
            isOptional: comp.isOptional ?? false,
            defaultEnabled: true,
            recipeId: recipe.id,
          },
        });

        for (const opt of comp.options) {
          if (opt.ingredientId !== null) {
            await prisma.recipeComponentOption.create({
              data: {
                name: opt.name,
                isDefault: opt.isDefault ?? false,
                componentId: component.id,
                recipeId: recipe.id,
                ingredientId: opt.ingredientId,
                quantity: opt.qty,
                unit: opt.unit,
              },
            });
          }
        }
      }
    }

    creadas++;
    console.log(`  ✓ [${creadas}/${recetas.length}] ${r.title}`);
  }

  console.log(`\n✅ ${creadas} recetas creadas correctamente`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
