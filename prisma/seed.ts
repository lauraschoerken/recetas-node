import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Crear usuario demo
  const hashedPassword = await bcrypt.hash("demo1234", 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@recetas.com" },
    update: {},
    create: {
      email: "demo@recetas.com",
      name: "Usuario Demo",
      password: hashedPassword,
    },
  });

  console.log(`Usuario demo creado: ${demoUser.email}`);

  // Definir recetas con ingredientes
  const recipes = [
    {
      title: "Sopa de Verduras",
      description:
        "Una sopa reconfortante y nutritiva con verduras frescas de temporada.",
      instructions: `1. Lavar y cortar todas las verduras en cubos pequeños.
2. En una olla grande, calentar el aceite de oliva a fuego medio.
3. Añadir la cebolla y el puerro, sofreír 5 minutos hasta que estén transparentes.
4. Agregar las zanahorias, el apio y las patatas. Cocinar 3 minutos.
5. Añadir el caldo de verduras y llevar a ebullición.
6. Reducir el fuego y cocinar a fuego lento durante 25-30 minutos.
7. Añadir las judías verdes en los últimos 10 minutos.
8. Salpimentar al gusto y servir caliente con un chorrito de aceite de oliva.`,
      servings: 4,
      isPublic: true,
      ingredients: [
        { name: "Zanahoria", quantity: 2, unit: "unidades" },
        { name: "Patata", quantity: 2, unit: "unidades" },
        { name: "Puerro", quantity: 1, unit: "unidad" },
        { name: "Cebolla", quantity: 1, unit: "unidad" },
        { name: "Apio", quantity: 2, unit: "ramas" },
        { name: "Judías verdes", quantity: 100, unit: "g" },
        { name: "Caldo de verduras", quantity: 1.5, unit: "L" },
        { name: "Aceite de oliva", quantity: 3, unit: "cucharadas" },
        { name: "Sal", quantity: 1, unit: "pizca" },
        { name: "Pimienta", quantity: 1, unit: "pizca" },
      ],
    },
    {
      title: "Carrilleras de Cerdo al Vino Tinto",
      description:
        "Carrilleras tiernas y jugosas cocinadas a fuego lento en una deliciosa salsa de vino tinto.",
      instructions: `1. Salpimentar las carrilleras y enharinarlas ligeramente.
2. En una cazuela, dorar las carrilleras por todos los lados con aceite de oliva. Reservar.
3. En la misma cazuela, sofreír la cebolla, la zanahoria y el puerro picados durante 10 minutos.
4. Añadir los dientes de ajo y cocinar 2 minutos más.
5. Incorporar el vino tinto y dejar reducir a la mitad.
6. Agregar el caldo de carne y las hierbas (tomillo, romero, laurel).
7. Devolver las carrilleras a la cazuela y tapar.
8. Cocinar a fuego muy lento durante 2.5-3 horas hasta que estén muy tiernas.
9. Retirar las carrilleras y triturar la salsa. Colar si se desea.
10. Servir las carrilleras con la salsa por encima.`,
      servings: 4,
      isPublic: true,
      ingredients: [
        { name: "Carrilleras de cerdo", quantity: 8, unit: "unidades" },
        { name: "Vino tinto", quantity: 500, unit: "ml" },
        { name: "Caldo de carne", quantity: 300, unit: "ml" },
        { name: "Cebolla", quantity: 2, unit: "unidades" },
        { name: "Zanahoria", quantity: 2, unit: "unidades" },
        { name: "Puerro", quantity: 1, unit: "unidad" },
        { name: "Ajo", quantity: 4, unit: "dientes" },
        { name: "Harina", quantity: 2, unit: "cucharadas" },
        { name: "Aceite de oliva", quantity: 4, unit: "cucharadas" },
        { name: "Tomillo", quantity: 1, unit: "rama" },
        { name: "Romero", quantity: 1, unit: "rama" },
        { name: "Laurel", quantity: 2, unit: "hojas" },
      ],
    },
    {
      title: "Crema de Calabaza",
      description:
        "Crema suave y aterciopelada de calabaza, perfecta para los días fríos.",
      instructions: `1. Pelar la calabaza y cortarla en cubos.
2. Picar la cebolla y el puerro.
3. En una olla, calentar el aceite y sofreír la cebolla y el puerro 5 minutos.
4. Añadir la calabaza y la patata. Cocinar 3 minutos removiendo.
5. Cubrir con el caldo de verduras y llevar a ebullición.
6. Cocinar a fuego medio 25 minutos hasta que la calabaza esté tierna.
7. Triturar con batidora hasta obtener una crema fina.
8. Añadir la nata y mezclar bien.
9. Salpimentar y añadir una pizca de nuez moscada.
10. Servir caliente con semillas de calabaza tostadas por encima.`,
      servings: 4,
      isPublic: true,
      ingredients: [
        { name: "Calabaza", quantity: 800, unit: "g" },
        { name: "Patata", quantity: 1, unit: "unidad" },
        { name: "Cebolla", quantity: 1, unit: "unidad" },
        { name: "Puerro", quantity: 1, unit: "unidad" },
        { name: "Caldo de verduras", quantity: 800, unit: "ml" },
        { name: "Nata para cocinar", quantity: 100, unit: "ml" },
        { name: "Aceite de oliva", quantity: 2, unit: "cucharadas" },
        { name: "Nuez moscada", quantity: 1, unit: "pizca" },
        { name: "Semillas de calabaza", quantity: 30, unit: "g" },
      ],
    },
    {
      title: "Poke de Salmón",
      description:
        "Bowl hawaiano fresco y saludable con salmón marinado, arroz y vegetales.",
      instructions: `1. Cocinar el arroz según las instrucciones del paquete. Dejar enfriar.
2. Cortar el salmón en cubos de 2cm.
3. Marinar el salmón con salsa de soja, aceite de sésamo y un poco de jengibre rallado durante 15 minutos.
4. Preparar el edamame (hervir 5 minutos si es congelado).
5. Cortar el aguacate en láminas y el pepino en rodajas finas.
6. Cortar el mango en cubos.
7. Montar el bowl: base de arroz, salmón marinado, aguacate, pepino, mango y edamame.
8. Decorar con semillas de sésamo, cebollino picado y un poco de salsa de soja.
9. Servir inmediatamente.`,
      servings: 2,
      isPublic: true,
      ingredients: [
        { name: "Salmón fresco", quantity: 300, unit: "g" },
        { name: "Arroz para sushi", quantity: 200, unit: "g" },
        { name: "Aguacate", quantity: 1, unit: "unidad" },
        { name: "Pepino", quantity: 1, unit: "unidad" },
        { name: "Mango", quantity: 1, unit: "unidad" },
        { name: "Edamame", quantity: 100, unit: "g" },
        { name: "Salsa de soja", quantity: 4, unit: "cucharadas" },
        { name: "Aceite de sésamo", quantity: 1, unit: "cucharada" },
        { name: "Jengibre", quantity: 1, unit: "cucharadita" },
        { name: "Semillas de sésamo", quantity: 2, unit: "cucharadas" },
        { name: "Cebollino", quantity: 2, unit: "cucharadas" },
      ],
    },
    {
      title: "Tortilla de Patatas",
      description:
        "La clásica tortilla española, jugosa por dentro y dorada por fuera.",
      instructions: `1. Pelar y cortar las patatas en láminas finas.
2. Picar la cebolla en juliana fina (opcional).
3. En una sartén con abundante aceite de oliva, freír las patatas a fuego medio-bajo.
4. Añadir la cebolla a mitad de cocción si se desea.
5. Cocinar hasta que las patatas estén tiernas pero no doradas (unos 20-25 minutos).
6. Escurrir bien el aceite y reservar.
7. Batir los huevos en un bol grande con sal.
8. Añadir las patatas a los huevos y mezclar bien. Dejar reposar 5 minutos.
9. En una sartén antiadherente con un poco de aceite, verter la mezcla.
10. Cocinar a fuego medio-bajo 4-5 minutos hasta que cuaje por abajo.
11. Dar la vuelta con ayuda de un plato y cocinar 3-4 minutos más.
12. La tortilla debe quedar jugosa por dentro.`,
      servings: 4,
      isPublic: true,
      ingredients: [
        { name: "Patata", quantity: 600, unit: "g" },
        { name: "Huevos", quantity: 6, unit: "unidades" },
        { name: "Cebolla", quantity: 1, unit: "unidad" },
        { name: "Aceite de oliva", quantity: 200, unit: "ml" },
        { name: "Sal", quantity: 1, unit: "cucharadita" },
      ],
    },
    {
      title: "Pasta Carbonara",
      description:
        "Auténtica pasta carbonara italiana con guanciale, huevo y pecorino.",
      instructions: `1. Poner a hervir agua con sal para la pasta.
2. Cortar el guanciale (o panceta) en tiras.
3. En una sartén sin aceite, dorar el guanciale hasta que esté crujiente. Reservar.
4. En un bol, batir las yemas con el huevo entero.
5. Añadir el queso pecorino rallado y pimienta negra. Mezclar bien.
6. Cocinar la pasta al dente según las instrucciones.
7. Reservar un vaso del agua de cocción antes de escurrir.
8. Escurrir la pasta y añadirla a la sartén con el guanciale (fuego apagado).
9. Verter la mezcla de huevo y queso sobre la pasta caliente.
10. Mezclar rápidamente añadiendo agua de cocción si es necesario.
11. La salsa debe quedar cremosa, nunca revuelta.
12. Servir inmediatamente con más pecorino y pimienta.`,
      servings: 4,
      isPublic: true,
      ingredients: [
        { name: "Espaguetis", quantity: 400, unit: "g" },
        { name: "Guanciale", quantity: 200, unit: "g" },
        { name: "Yemas de huevo", quantity: 4, unit: "unidades" },
        { name: "Huevos", quantity: 1, unit: "unidad" },
        { name: "Queso pecorino", quantity: 100, unit: "g" },
        { name: "Pimienta negra", quantity: 1, unit: "cucharadita" },
        { name: "Sal", quantity: 1, unit: "pizca" },
      ],
    },
    {
      title: "Ensalada César",
      description:
        "Ensalada fresca con pollo a la plancha, croutones crujientes y salsa César casera.",
      instructions: `1. Preparar la salsa César: mezclar mayonesa, ajo picado, zumo de limón, mostaza, anchoas picadas y queso parmesano rallado.
2. Salpimentar las pechugas de pollo y cocinarlas a la plancha hasta que estén doradas y hechas por dentro.
3. Dejar reposar el pollo 5 minutos y cortar en tiras.
4. Cortar el pan en cubos y tostarlos en sartén con aceite de oliva y ajo hasta que estén dorados.
5. Lavar y cortar la lechuga romana en trozos.
6. En un bol grande, mezclar la lechuga con la salsa César.
7. Añadir el pollo, los croutones y las láminas de parmesano.
8. Servir inmediatamente.`,
      servings: 2,
      isPublic: true,
      ingredients: [
        { name: "Lechuga romana", quantity: 1, unit: "unidad" },
        { name: "Pechuga de pollo", quantity: 2, unit: "unidades" },
        { name: "Pan de hogaza", quantity: 100, unit: "g" },
        { name: "Queso parmesano", quantity: 50, unit: "g" },
        { name: "Mayonesa", quantity: 4, unit: "cucharadas" },
        { name: "Anchoas", quantity: 4, unit: "filetes" },
        { name: "Ajo", quantity: 2, unit: "dientes" },
        { name: "Limón", quantity: 1, unit: "unidad" },
        { name: "Mostaza Dijon", quantity: 1, unit: "cucharadita" },
        { name: "Aceite de oliva", quantity: 3, unit: "cucharadas" },
      ],
    },
    {
      title: "Pollo al Horno con Patatas",
      description:
        "Pollo jugoso asado al horno con patatas doradas y hierbas aromáticas.",
      instructions: `1. Precalentar el horno a 200°C.
2. Lavar y secar el pollo. Salpimentar por dentro y por fuera.
3. Rellenar el interior con limón cortado, ajo y hierbas.
4. Untar el pollo con mantequilla blanda mezclada con hierbas.
5. Pelar y cortar las patatas en cuartos.
6. Colocar el pollo en una bandeja de horno, rodearlo con las patatas.
7. Añadir la cebolla cortada en gajos y los dientes de ajo.
8. Rociar todo con aceite de oliva y vino blanco.
9. Hornear 1 hora y 15 minutos, regando con los jugos cada 20 minutos.
10. El pollo está listo cuando al pinchar el muslo sale jugo claro.
11. Dejar reposar 10 minutos antes de trinchar.
12. Servir con las patatas y la salsa del asado.`,
      servings: 4,
      isPublic: true,
      ingredients: [
        { name: "Pollo entero", quantity: 1.5, unit: "kg" },
        { name: "Patata", quantity: 800, unit: "g" },
        { name: "Cebolla", quantity: 2, unit: "unidades" },
        { name: "Ajo", quantity: 1, unit: "cabeza" },
        { name: "Limón", quantity: 1, unit: "unidad" },
        { name: "Mantequilla", quantity: 50, unit: "g" },
        { name: "Vino blanco", quantity: 150, unit: "ml" },
        { name: "Tomillo", quantity: 4, unit: "ramas" },
        { name: "Romero", quantity: 2, unit: "ramas" },
        { name: "Aceite de oliva", quantity: 4, unit: "cucharadas" },
        { name: "Sal", quantity: 1, unit: "cucharada" },
        { name: "Pimienta", quantity: 1, unit: "cucharadita" },
      ],
    },
  ];

  // Crear recetas con ingredientes
  for (const recipeData of recipes) {
    const { ingredients, ...recipeInfo } = recipeData;

    // Crear o actualizar ingredientes
    const ingredientRecords = [];
    for (const ing of ingredients) {
      let ingredient = await prisma.ingredient.findFirst({
        where: { name: ing.name, status: "GLOBAL" },
      });
      if (!ingredient) {
        ingredient = await prisma.ingredient.create({
          data: { name: ing.name, unit: ing.unit },
        });
      } else {
        ingredient = await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { unit: ing.unit },
        });
      }
      ingredientRecords.push({ ...ingredient, quantity: ing.quantity });
    }

    // Verificar si la receta ya existe para este usuario
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        title: recipeInfo.title,
        userId: demoUser.id,
      },
    });

    if (!existingRecipe) {
      // Crear receta con ingredientes
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeInfo,
          userId: demoUser.id,
          ingredients: {
            create: ingredientRecords.map((ing) => ({
              quantity: ing.quantity,
              ingredientId: ing.id,
            })),
          },
        },
      });
      console.log(`Receta creada: ${recipe.title}`);
    } else {
      console.log(`Receta ya existe: ${recipeInfo.title}`);
    }
  }

  console.log("Seed completado!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
