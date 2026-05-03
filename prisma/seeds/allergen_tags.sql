-- ============================================================
-- TAGS DE ALÉRGENOS — 14 alérgenos de obligatorio etiquetado UE
-- isGlobal = true  →  visibles para todos los usuarios
-- userId   = NULL  →  asignación global (no personal)
-- ============================================================

-- ── 1. Insertar los 14 tags (sólo si no existen ya) ─────────
INSERT INTO "IngredientTag" (name, color, "isGlobal", "createdByUserId")
SELECT name, color, true, NULL
FROM (VALUES
  ('Gluten',       '#f59e0b'),   -- trigo, centeno, cebada, avena
  ('Crustáceos',   '#f97316'),   -- gambas, langostinos, cangrejos…
  ('Huevo',        '#eab308'),
  ('Pescado',      '#3b82f6'),
  ('Cacahuete',    '#a16207'),
  ('Soja',         '#16a34a'),
  ('Lácteos',      '#38bdf8'),   -- leche y derivados
  ('Frutos secos', '#15803d'),   -- almendras, avellanas, nueces…
  ('Apio',         '#4ade80'),
  ('Mostaza',      '#84cc16'),
  ('Sésamo',       '#d97706'),
  ('Sulfitos',     '#7c3aed'),   -- SO₂ > 10 mg/kg / 10 mg/l
  ('Altramuz',     '#ec4899'),
  ('Moluscos',     '#6366f1')    -- almejas, mejillones, calamares…
) AS t(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM "IngredientTag" WHERE "IngredientTag".name = t.name AND "isGlobal" = true
);

-- ── 2. Asignar tags a ingredientes (global, userId = NULL) ───
-- Se usa WHERE NOT EXISTS para ser idempotente en cualquier versión de PG.

INSERT INTO "IngredientTagAssignment" ("ingredientId", "tagId", "userId")
SELECT pairs.ing_id, it.id, NULL
FROM (VALUES
  -- ─── GLUTEN ─────────────────────────────────────────────
  (4457, 'Gluten'),   -- Avena
  (4459, 'Gluten'),   -- Bulgur
  (4458, 'Gluten'),   -- Cous cous
  (4473, 'Gluten'),   -- Fideos
  (4470, 'Gluten'),   -- Fusilli
  (4466, 'Gluten'),   -- Galletas María
  (4522, 'Gluten'),   -- Galletas saladas
  (4249, 'Gluten'),   -- Harina de trigo
  (4462, 'Gluten'),   -- Harina integral
  (4472, 'Gluten'),   -- Lasaña (placas)
  (4254, 'Gluten'),   -- Macarrones
  (4286, 'Gluten'),   -- Pan chapata
  (4561, 'Gluten'),   -- Pan de avena
  (4591, 'Gluten'),   -- Pan de centeno
  (4465, 'Gluten'),   -- Pan de barra
  (4526, 'Gluten'),   -- Pan de hamburguesa
  (4527, 'Gluten'),   -- Pan de hot dog
  (4251, 'Gluten'),   -- Pan de molde blanco
  (4464, 'Gluten'),   -- Pan de molde integral
  (4525, 'Gluten'),   -- Pan de pita
  (4285, 'Gluten'),   -- Pan naan
  (4252, 'Gluten'),   -- Pan rallado
  (4471, 'Gluten'),   -- Penne rigate
  (4284, 'Gluten'),   -- Picos de pan
  (4523, 'Gluten'),   -- Regañás
  (4469, 'Gluten'),   -- Spaghetti
  (4255, 'Gluten'),   -- Tagliatelle
  (4287, 'Gluten'),   -- Tortilla de trigo (wrap)
  (4288, 'Gluten'),   -- Tostadas tipo Wasa (centeno)
  (4533, 'Gluten'),   -- Base de pizza
  (4530, 'Gluten'),   -- Biscotes
  (4535, 'Gluten'),   -- Canelones de carne (preparados)
  (4524, 'Gluten'),   -- Crackers integrales
  (4536, 'Gluten'),   -- Croquetas (congeladas)
  (4291, 'Gluten'),   -- Empanadillas (congeladas)
  (4538, 'Gluten'),   -- Fingers de pollo (rebozado)
  (4539, 'Gluten'),   -- Delicias de pollo (rebozado)
  (4290, 'Gluten'),   -- Lasaña boloñesa (preparada)
  (4289, 'Gluten'),   -- Masa de pizza fresca
  (4537, 'Gluten'),   -- Nuggets de pollo (rebozado)
  (4292, 'Gluten'),   -- Varitas de merluza (congeladas)
  (4293, 'Gluten'),   -- Palitos de surimi (almidón de trigo)
  (4482, 'Gluten'),   -- Salsa de soja (trigo)
  (4483, 'Gluten'),   -- Salsa worcestershire (vinagre de malta)
  (4571, 'Gluten'),   -- Bebida de avena
  (4507, 'Gluten'),   -- Pringles Original (almidón de trigo)
  (4318, 'Gluten'),   -- Pringles BBQ
  (4317, 'Gluten'),   -- Pringles Crema y Cebolla
  (4509, 'Gluten'),   -- Pringles Paprika
  (4508, 'Gluten'),   -- Pringles Queso
  (4279, 'Gluten'),   -- Doritos Cool Ranch (harina de trigo)
  (4514, 'Gluten'),   -- Doritos Nacho Cheese (harina de trigo)
  (4511, 'Gluten'),   -- Lays Onduladas Jamón (aromas con trigo)
  (4512, 'Gluten'),   -- Lays Barbacoa
  (4277, 'Gluten'),   -- Lays Onduladas Queso
  (4513, 'Gluten'),   -- Ruffles Crema Agria
  (4278, 'Gluten'),   -- Ruffles Queso
  (4541, 'Gluten'),   -- Gazpacho (brick) — contiene pan
  (4294, 'Gluten'),   -- Salmorejo (brick) — contiene pan
  (4531, 'Gluten'),   -- Pizza 4 quesos (congelada)
  (4532, 'Gluten'),   -- Pizza barbacoa (congelada)
  (4592, 'Gluten'),   -- Pizza margarita (congelada)
  (4593, 'Gluten'),   -- Pizza vegetal (congelada)
  (4534, 'Gluten'),   -- Paella congelada (puede contener)
  (4542, 'Gluten'),   -- Cocido madrileño (conserva)
  (4543, 'Gluten'),   -- Fabada asturiana (conserva)
  (4468, 'Gluten'),   -- Levadura química (almidón de trigo como portador)
  (4280, 'Gluten'),   -- Palomitas de azúcar/caramelo
  (4517, 'Gluten'),   -- Palomitas de mantequilla
  (4518, 'Gluten'),   -- Palomitas microondas (mantequilla)

  -- ─── CRUSTÁCEOS ─────────────────────────────────────────
  (4368, 'Crustáceos'),  -- Camarones
  (4369, 'Crustáceos'),  -- Cigalas
  (4566, 'Crustáceos'),  -- Cangrejos de río
  (4361, 'Crustáceos'),  -- Gambas
  (4193, 'Crustáceos'),  -- Langostinos
  (4370, 'Crustáceos'),  -- Nécora
  (4196, 'Crustáceos'),  -- Buey de mar
  (4195, 'Crustáceos'),  -- Percebes

  -- ─── HUEVO ──────────────────────────────────────────────
  (4238, 'Huevo'),  -- Claras de huevo pasteurizadas
  (4439, 'Huevo'),  -- Huevo
  (4440, 'Huevo'),  -- Huevo de codorniz
  (4261, 'Huevo'),  -- Mayonesa
  (4312, 'Huevo'),  -- Salsa alioli
  (4536, 'Huevo'),  -- Croquetas (congeladas)
  (4291, 'Huevo'),  -- Empanadillas (congeladas)
  (4290, 'Huevo'),  -- Lasaña boloñesa (preparada)
  (4538, 'Huevo'),  -- Fingers de pollo
  (4539, 'Huevo'),  -- Delicias de pollo
  (4537, 'Huevo'),  -- Nuggets de pollo
  (4540, 'Huevo'),  -- Ensaladilla rusa (preparada)
  (4466, 'Huevo'),  -- Galletas María
  (4522, 'Huevo'),  -- Galletas saladas
  (4531, 'Huevo'),  -- Pizza 4 quesos (congelada)
  (4532, 'Huevo'),  -- Pizza barbacoa (congelada)
  (4592, 'Huevo'),  -- Pizza margarita (congelada)
  (4593, 'Huevo'),  -- Pizza vegetal (congelada)

  -- ─── PESCADO ────────────────────────────────────────────
  (4325, 'Pescado'),  -- Atún fresco
  (4326, 'Pescado'),  -- Atún en lata al natural
  (4188, 'Pescado'),  -- Atún en lata en aceite de girasol
  (4327, 'Pescado'),  -- Atún en lata en aceite de oliva
  (4300, 'Pescado'),  -- Bonito del norte en aceite
  (4189, 'Pescado'),  -- Boquerones
  (4329, 'Pescado'),  -- Anchoas en lata
  (4324, 'Pescado'),  -- Bacalao fresco
  (4222, 'Pescado'),  -- Bacalao salado
  (4359, 'Pescado'),  -- Caballa
  (4554, 'Pescado'),  -- Caballa en aceite
  (4191, 'Pescado'),  -- Dorada
  (4354, 'Pescado'),  -- Emperador
  (4190, 'Pescado'),  -- Lenguado
  (4356, 'Pescado'),  -- Lubina
  (4220, 'Pescado'),  -- Merluza
  (4553, 'Pescado'),  -- Melva en aceite
  (4355, 'Pescado'),  -- Rape
  (4358, 'Pescado'),  -- Rodaballo
  (4365, 'Pescado'),  -- Salmón
  (4328, 'Pescado'),  -- Sardinas
  (4550, 'Pescado'),  -- Sardinillas en aceite
  (4357, 'Pescado'),  -- Trucha
  (4292, 'Pescado'),  -- Varitas de merluza (congeladas)
  (4296, 'Pescado'),  -- Aceitunas rellenas (anchoa)
  (4293, 'Pescado'),  -- Palitos de surimi
  (4483, 'Pescado'),  -- Salsa worcestershire (anchovies)
  (4540, 'Pescado'),  -- Ensaladilla rusa (preparada)

  -- ─── CACAHUETE ──────────────────────────────────────────
  (4584, 'Cacahuete'),  -- Crema de cacahuete

  -- ─── SOJA ───────────────────────────────────────────────
  (4247, 'Soja'),   -- Soja
  (4456, 'Soja'),   -- Edamame
  (4307, 'Soja'),   -- Bebida de soja
  (4482, 'Soja'),   -- Salsa de soja

  -- ─── LÁCTEOS ────────────────────────────────────────────
  (4421, 'Lácteos'),  -- Leche desnatada
  (4219, 'Lácteos'),  -- Leche entera
  (4447, 'Lácteos'),  -- Leche semidesnatada
  (4422, 'Lácteos'),  -- Leche sin lactosa (proteínas de leche)
  (4367, 'Lácteos'),  -- Nata para cocinar (18%)
  (4424, 'Lácteos'),  -- Nata para montar (35%)
  (4425, 'Lácteos'),  -- Nata ácida (crème fraîche)
  (4437, 'Lácteos'),  -- Mantequilla
  (4438, 'Lácteos'),  -- Mantequilla sin sal
  (4237, 'Lácteos'),  -- Margarina
  (4436, 'Lácteos'),  -- Mascarpone
  (4234, 'Lácteos'),  -- Queso brie
  (4433, 'Lácteos'),  -- Queso camembert
  (4430, 'Lácteos'),  -- Queso cheddar
  (4434, 'Lácteos'),  -- Queso crema
  (4432, 'Lácteos'),  -- Queso de cabra
  (4232, 'Lácteos'),  -- Queso edam
  (4233, 'Lácteos'),  -- Queso emmental
  (4235, 'Lácteos'),  -- Queso en lonchas
  (4431, 'Lácteos'),  -- Queso feta
  (4427, 'Lácteos'),  -- Queso manchego
  (4428, 'Lácteos'),  -- Queso mozzarella
  (4429, 'Lácteos'),  -- Queso parmesano
  (4435, 'Lácteos'),  -- Requesón
  (4236, 'Lácteos'),  -- Ricotta
  (4283, 'Lácteos'),  -- Rulos de queso
  (4276, 'Lácteos'),  -- Yogur desnatado
  (4426, 'Lácteos'),  -- Yogur griego
  (4275, 'Lácteos'),  -- Yogur natural
  (4578, 'Lácteos'),  -- Tzatziki (yogurt)
  (4315, 'Lácteos'),  -- Nutella (leche en polvo)
  (4583, 'Lácteos'),  -- Nocilla (leche en polvo)
  (4531, 'Lácteos'),  -- Pizza 4 quesos (congelada)
  (4532, 'Lácteos'),  -- Pizza barbacoa (congelada)
  (4592, 'Lácteos'),  -- Pizza margarita (congelada)
  (4593, 'Lácteos'),  -- Pizza vegetal (congelada)
  (4290, 'Lácteos'),  -- Lasaña boloñesa (preparada) — bechamel
  (4536, 'Lácteos'),  -- Croquetas (bechamel)
  (4537, 'Lácteos'),  -- Nuggets de pollo
  (4539, 'Lácteos'),  -- Delicias de pollo

  -- ─── FRUTOS SECOS ────────────────────────────────────────
  (4501, 'Frutos secos'),  -- Almendras
  (4504, 'Frutos secos'),  -- Anacardos
  (4503, 'Frutos secos'),  -- Avellanas
  (4463, 'Frutos secos'),  -- Harina de almendra
  (4502, 'Frutos secos'),  -- Nueces
  (4272, 'Frutos secos'),  -- Piñones
  (4271, 'Frutos secos'),  -- Pistachos
  (4572, 'Frutos secos'),  -- Bebida de almendras
  (4315, 'Frutos secos'),  -- Nutella (avellanas)
  (4583, 'Frutos secos'),  -- Nocilla (avellanas)

  -- ─── APIO ────────────────────────────────────────────────
  (4316, 'Apio'),   -- Apio
  (4208, 'Apio'),   -- Apio nabo

  -- ─── MOSTAZA ─────────────────────────────────────────────
  (4262, 'Mostaza'),  -- Mostaza clásica
  (4486, 'Mostaza'),  -- Mostaza Dijon
  (4529, 'Mostaza'),  -- Curry en polvo (semillas de mostaza)
  (4496, 'Mostaza'),  -- Ras el hanout (semillas de mostaza)

  -- ─── SÉSAMO ──────────────────────────────────────────────
  (4273, 'Sésamo'),  -- Semillas de sésamo
  (4585, 'Sésamo'),  -- Tahini (pasta de sésamo)
  (4311, 'Sésamo'),  -- Hummus (contiene tahini)
  (4525, 'Sésamo'),  -- Pan de pita (a menudo sésamo)
  (4285, 'Sésamo'),  -- Pan naan (a menudo sésamo)

  -- ─── SULFITOS ────────────────────────────────────────────
  (4574, 'Sulfitos'),  -- Vino blanco
  (4310, 'Sulfitos'),  -- Vino tinto
  (4576, 'Sulfitos'),  -- Sidra
  (4575, 'Sulfitos'),  -- Cerveza
  (4260, 'Sulfitos'),  -- Vinagre de Módena
  (4481, 'Sulfitos'),  -- Vinagre de vino blanco
  (4544, 'Sulfitos'),  -- Pepinillos en vinagre
  (4547, 'Sulfitos'),  -- Cebolletas en vinagre

  -- ─── MOLUSCOS ────────────────────────────────────────────
  (4194, 'Moluscos'),  -- Almejas
  (4363, 'Moluscos'),  -- Berberechos
  (4552, 'Moluscos'),  -- Berberechos en lata
  (4192, 'Moluscos'),  -- Calamar
  (4565, 'Moluscos'),  -- Chirlas
  (4362, 'Moluscos'),  -- Mejillones
  (4551, 'Moluscos'),  -- Mejillones en escabeche (lata)
  (4410, 'Moluscos'),  -- Navajas
  (4299, 'Moluscos'),  -- Navajas en lata
  (4360, 'Moluscos'),  -- Pulpo
  (4564, 'Moluscos')   -- Sepia

) AS pairs(ing_id, tag_name)
JOIN "IngredientTag" it ON it.name = pairs.tag_name AND it."isGlobal" = true
WHERE NOT EXISTS (
  SELECT 1
  FROM "IngredientTagAssignment" ita
  WHERE ita."ingredientId" = pairs.ing_id
    AND ita."tagId" = it.id
    AND ita."userId" IS NULL
);

-- ── Resumen ──────────────────────────────────────────────────
SELECT
  it.name AS "Tag",
  COUNT(ita.id) AS "Ingredientes asignados"
FROM "IngredientTag" it
LEFT JOIN "IngredientTagAssignment" ita ON ita."tagId" = it.id AND ita."userId" IS NULL
WHERE it."isGlobal" = true
GROUP BY it.name
ORDER BY it.name;
