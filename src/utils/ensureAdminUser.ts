import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Crea el usuario admin al arrancar el servidor si no existe todavía.
 * Credenciales configurables vía variables de entorno:
 *   ADMIN_EMAIL    (por defecto: admin@recetas.com)
 *   ADMIN_PASSWORD (por defecto: admin1234)
 *   ADMIN_NAME     (por defecto: Admin)
 */
export async function ensureAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL || "admin@recetas.com";
  const password = process.env.ADMIN_PASSWORD || "admin1234";
  const name = process.env.ADMIN_NAME || "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Ya existe — asegurar que tiene rol ADMIN por si acaso
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
      console.log(`[admin] Usuario ${email} promovido a ADMIN.`);
    } else {
      console.log(`[admin] Usuario admin ${email} ya existe.`);
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, password: hashedPassword, role: "ADMIN" },
  });
  console.log(`[admin] Usuario admin creado: ${email}`);
}
