import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";

const prisma = new PrismaClient();

// ──────────────────────────────────────────
// i18n labels for PDF
// ──────────────────────────────────────────
const PDF_LABELS = {
  es: {
    servings: "porciones",
    ingredients: "Ingredientes",
    instructions: "Instrucciones",
    author: "Por",
    public: "Pública",
    private: "Privada",
    recipeUnit: "receta",
    subRecipeNote: "se descargará otro PDF con esta receta",
    footer: "Exportado desde Recetas App",
  },
  en: {
    servings: "servings",
    ingredients: "Ingredients",
    instructions: "Instructions",
    author: "By",
    public: "Public",
    private: "Private",
    recipeUnit: "recipe",
    subRecipeNote: "another PDF will be downloaded for this recipe",
    footer: "Exported from Recetas App",
  },
} as const;

type PdfLang = keyof typeof PDF_LABELS;
function getLabels(lang?: string) {
  return PDF_LABELS[(lang === "en" ? "en" : "es") as PdfLang];
}

// ──────────────────────────────────────────
// Image helper — silently returns null on any error
// ──────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (!url || !url.startsWith("http")) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────
// Core renderer — draws one recipe into an open PDFDocument
// ──────────────────────────────────────────
async function renderRecipePage(
  doc: any,
  recipe: any,
  options: {
    selectedOptions?: Record<number, number>;
    showAuthor?: boolean;
    showVisibility?: boolean;
    lang?: string;
  },
): Promise<void> {
  const {
    selectedOptions = {},
    showAuthor = false,
    showVisibility = false,
  } = options;
  const lbl = getLabels(options.lang);

  const blue = "#2461d3";
  const darkBlue = "#1a3a6e";
  const textDark = "#1f2937";
  const textGray = "#6b7280";
  const bgLight = "#eff6ff";

  // ── Header bar ─────────────────────────
  doc.rect(0, 0, 595.28, 88).fill(darkBlue);
  doc
    .fontSize(20)
    .fillColor("#ffffff")
    .text(recipe.title, 50, 16, { align: "center", width: 495 });

  const metaParts = [`${recipe.servings} ${lbl.servings}`];
  if (showAuthor && recipe.user?.name)
    metaParts.push(`${lbl.author} ${recipe.user.name}`);
  if (showVisibility)
    metaParts.push(recipe.isPublic ? lbl.public : lbl.private);
  doc
    .fontSize(9)
    .fillColor("#93c5fd")
    .text(metaParts.join("   |   "), 50, 56, { align: "center", width: 495 });

  doc.y = 104;

  // ── Recipe image ───────────────────────
  if (recipe.imageUrl) {
    const imgBuf = await fetchImageBuffer(recipe.imageUrl);
    if (imgBuf) {
      try {
        const imgW = 200;
        const imgX = (595.28 - imgW) / 2;
        doc.image(imgBuf, imgX, doc.y, { width: imgW, height: 150 });
        doc.y += 158;
      } catch {
        // skip unsupported format
      }
    }
  }

  doc.moveDown(0.5);

  // ── Description ────────────────────────
  if (recipe.description) {
    doc
      .fontSize(10)
      .fillColor(textGray)
      .text(recipe.description, { align: "left" });
    doc.moveDown(0.8);
  }

  // ── Section title helper ───────────────
  const sectionTitle = (title: string) => {
    doc.moveDown(0.5);
    const sy = doc.y;
    doc.rect(50, sy, 495, 26).fill(bgLight);
    doc.rect(50, sy, 5, 26).fill(blue);
    doc
      .fontSize(13)
      .fillColor(blue)
      .text(title, 64, sy + 6, { lineBreak: false });
    doc.y = sy + 32;
  };

  // ── Collect all ingredients ────────────
  const allIngredients: { quantity: number; unit: string; name: string }[] = [];

  for (const ri of recipe.ingredients || []) {
    allIngredients.push({
      quantity: ri.quantity,
      unit: ri.unit || ri.ingredient?.unit || "",
      name: ri.ingredient?.name || "",
    });
  }

  for (const comp of recipe.components || []) {
    const selectedOptId = selectedOptions[comp.id];
    const opt = selectedOptId
      ? comp.options.find((o: any) => o.id === selectedOptId)
      : comp.options.find((o: any) => o.isDefault) || comp.options[0];
    if (!opt) continue;

    if (opt.ingredient) {
      allIngredients.push({
        quantity: opt.quantity || 0,
        unit: opt.unit || opt.ingredient.unit || "",
        name: opt.ingredient.name,
      });
    } else if (opt.recipe) {
      allIngredients.push({
        quantity: opt.recipeServings || 1,
        unit: lbl.recipeUnit,
        name: `${opt.recipe.title}  (${lbl.subRecipeNote})`,
      });
    }
  }

  if (allIngredients.length > 0) {
    sectionTitle(lbl.ingredients);
    for (const ing of allIngredients) {
      doc
        .fontSize(11)
        .fillColor(textDark)
        .text(`  ${ing.quantity} ${ing.unit}  -  ${ing.name}`);
      doc.moveDown(0.18);
    }
  }

  // ── Instructions ───────────────────────
  if (recipe.instructions) {
    sectionTitle(lbl.instructions);
    const lines = recipe.instructions.split("\n");
    let stepNum = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const isAlreadyNumbered = /^\d+[\.\)]/.test(trimmed);
      const prefix = isAlreadyNumbered ? "" : `${stepNum}. `;
      if (!isAlreadyNumbered) stepNum++;
      doc.fontSize(11).fillColor(textDark).text(`  ${prefix}${trimmed}`);
      doc.moveDown(0.28);
    }
  }

  // ── Footer ─────────────────────────────
  doc.moveDown(2);
  doc.fontSize(8).fillColor("#9ca3af").text(lbl.footer, { align: "center" });
}

export const pdfService = {
  async getRecipeDataForPdf(recipeId: number, userId: number) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, OR: [{ userId }, { isPublic: true }] },
      include: {
        user: { select: { name: true } },
        ingredients: {
          include: {
            ingredient: { include: { variants: true } },
            variant: true,
            cookedVariant: true,
          },
        },
        components: {
          include: {
            options: {
              include: {
                ingredient: true,
                recipe: {
                  select: {
                    id: true,
                    title: true,
                    servings: true,
                    ingredients: {
                      include: {
                        ingredient: { include: { variants: true } },
                        variant: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!recipe) throw new Error("Receta no encontrada");
    return recipe;
  },

  async generatePdfBuffer(
    recipe: any,
    options: {
      selectedOptions?: Record<number, number>;
      showAuthor?: boolean;
      showVisibility?: boolean;
      lang?: string;
    } = {},
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await renderRecipePage(doc, recipe, options);

    doc.end();
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  },

  async generateCombinedPdfBuffer(
    entries: { recipe: any; selectedOptions?: Record<number, number> }[],
    options: {
      showAuthor?: boolean;
      showVisibility?: boolean;
      lang?: string;
    } = {},
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    for (let i = 0; i < entries.length; i++) {
      if (i > 0) doc.addPage();
      await renderRecipePage(doc, entries[i].recipe, {
        ...options,
        selectedOptions: entries[i].selectedOptions,
      });
    }

    doc.end();
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  },

  generatePdfHtml(recipe: any): string {
    const ingredientsList = recipe.ingredients
      .map(
        (ri: any) =>
          `<li>${ri.quantity} ${ri.unit || ri.ingredient.unit} — ${ri.ingredient.name}${ri.variant && !ri.variant.isDefault ? ` (${ri.variant.name})` : ""}</li>`,
      )
      .join("");

    const componentsList = recipe.components
      .map(
        (comp: any) => `
      <div class="component">
        <h3>${comp.name}${comp.isOptional ? ' <span class="optional">(Opcional)</span>' : ""}</h3>
        <ul>${comp.options
          .map(
            (opt: any) => `
          <li${opt.isDefault ? ' class="default"' : ""}>
            ${opt.name}${opt.quantity ? ` — ${opt.quantity} ${opt.unit}` : ""}
            ${opt.isDefault ? " ★" : ""}
          </li>`,
          )
          .join("")}
        </ul>
      </div>
    `,
      )
      .join("");

    const instructionsHtml = recipe.instructions
      ? recipe.instructions
          .split("\n")
          .map((line: string) => `<p>${line}</p>`)
          .join("")
      : "<p>Sin instrucciones</p>";

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #e67e22; padding-bottom: 1rem; }
  .header h1 { font-size: 2rem; color: #2c3e50; margin: 0; }
  .header .meta { color: #777; font-size: 0.9rem; margin-top: 0.5rem; }
  .recipe-image { text-align: center; margin: 1.5rem 0; }
  .recipe-image img { max-width: 100%; max-height: 400px; border-radius: 12px; object-fit: cover; }
  .description { font-style: italic; color: #555; margin: 1rem 0; padding: 1rem; background: #fdf6ec; border-radius: 8px; }
  .section { margin: 1.5rem 0; }
  .section h2 { color: #e67e22; font-size: 1.3rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
  .section ul { padding-left: 1.5rem; }
  .section li { margin: 0.4rem 0; }
  .component h3 { color: #2c3e50; font-size: 1.1rem; }
  .optional { color: #999; font-weight: normal; font-size: 0.9rem; }
  .default { font-weight: bold; }
  .nutrition { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; text-align: center; margin: 1rem 0; }
  .nutrition .item { background: #f9f9f9; padding: 0.8rem 0.5rem; border-radius: 8px; }
  .nutrition .value { font-size: 1.2rem; font-weight: bold; color: #e67e22; }
  .nutrition .label { font-size: 0.8rem; color: #777; }
  .footer { text-align: center; color: #aaa; font-size: 0.8rem; margin-top: 3rem; border-top: 1px solid #eee; padding-top: 1rem; }
  .app-meta { display: none; }
</style>
</head>
<body>
  <div class="app-meta" data-app="recetas-app" data-version="1.0" data-recipe-id="${recipe.id}"></div>
  <div class="header">
    <h1>${recipe.title}</h1>
    <div class="meta">
      ${recipe.servings} porciones · Por ${recipe.user?.name || "Anónimo"}
      ${recipe.isPublic ? " · Pública" : " · Privada"}
    </div>
  </div>

  ${recipe.imageUrl ? `<div class="recipe-image"><img src="${recipe.imageUrl}" alt="${recipe.title}"></div>` : ""}
  ${recipe.description ? `<div class="description">${recipe.description}</div>` : ""}

  ${
    recipe.customCalories ||
    recipe.customProtein ||
    recipe.customCarbs ||
    recipe.customFat ||
    recipe.customFiber
      ? `
  <div class="section">
    <h2>Información Nutricional (por porción)</h2>
    <div class="nutrition">
      <div class="item"><div class="value">${Math.round((recipe.customCalories || 0) / recipe.servings)}</div><div class="label">kcal</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customProtein || 0) / recipe.servings)}g</div><div class="label">Proteína</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customCarbs || 0) / recipe.servings)}g</div><div class="label">Carbos</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customFat || 0) / recipe.servings)}g</div><div class="label">Grasa</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customFiber || 0) / recipe.servings)}g</div><div class="label">Fibra</div></div>
    </div>
  </div>`
      : ""
  }

  <div class="section">
    <h2>Ingredientes</h2>
    <ul>${ingredientsList || "<li>Sin ingredientes</li>"}</ul>
  </div>

  ${
    recipe.components.length > 0
      ? `
  <div class="section">
    <h2>Componentes</h2>
    ${componentsList}
  </div>`
      : ""
  }

  <div class="section">
    <h2>Instrucciones</h2>
    ${instructionsHtml}
  </div>

  <div class="footer">Exportado desde Recetas App</div>
</body>
</html>`;
  },

  parseImportedPdfHtml(html: string) {
    // Only accept PDFs generated by our app (check for meta tag)
    if (!html.includes('data-app="recetas-app"')) {
      throw new Error(
        "Solo se pueden importar PDFs generados por la aplicación",
      );
    }

    const getContent = (tag: string, html: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
      const match = html.match(regex);
      return match ? match[1].trim() : "";
    };

    const title = getContent("h1", html);
    const descMatch = html.match(/<div class="description">([\s\S]*?)<\/div>/);
    const description = descMatch ? descMatch[1].trim() : undefined;

    const instructionsMatch = html.match(
      /<h2>Instrucciones<\/h2>\s*([\s\S]*?)<\/div>/,
    );
    let instructions: string | undefined;
    if (instructionsMatch) {
      instructions = instructionsMatch[1]
        .replace(/<p>/g, "")
        .replace(/<\/p>/g, "\n")
        .trim();
    }

    const metaMatch = html.match(/data-recipe-id="(\d+)"/);
    const sourceRecipeId = metaMatch ? parseInt(metaMatch[1]) : undefined;

    const servingsMatch = html.match(/(\d+)\s*porciones/);
    const servings = servingsMatch ? parseInt(servingsMatch[1]) : 4;

    const ingredientMatches = [
      ...html.matchAll(/<li>(\d+(?:\.\d+)?)\s+(\S+)\s+—\s+([^<]+)<\/li>/g),
    ];
    const ingredients = ingredientMatches.map((m) => ({
      quantity: parseFloat(m[1]),
      unit: m[2],
      name: m[3].replace(/\s*\([^)]+\)$/, "").trim(),
    }));

    return {
      title,
      description,
      instructions,
      servings,
      ingredients,
      sourceRecipeId,
    };
  },
};
