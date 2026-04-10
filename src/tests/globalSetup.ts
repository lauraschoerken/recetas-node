import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export default async function globalSetup() {
  console.log('\n🧪 Configurando base de datos de test...');
  
  try {
    // Ejecutar migraciones en la base de datos de test
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      },
      stdio: 'pipe'
    });
    
    console.log('✅ Base de datos de test preparada');
  } catch (error) {
    console.log('⚠️  Aplicando reset de base de datos de test...');
    
    try {
      execSync('npx prisma db push --force-reset --accept-data-loss', {
        cwd: path.resolve(__dirname, '../..'),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL
        },
        stdio: 'pipe'
      });
      console.log('✅ Base de datos de test reseteada');
    } catch (resetError) {
      console.error('❌ Error configurando base de datos de test');
      throw resetError;
    }
  }
}
