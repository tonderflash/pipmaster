/**
 * Environment variables loader
 */
import { readFileSync } from 'fs';

/**
 * Loads environment variables from .env file
 */
export function loadEnvVariables() {
  try {
    const envContent = readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.join('=').trim().replace(/^"/, '').replace(/"$/, '');
        }
      }
    });
    return true;
  } catch (error) {
    console.warn('No se pudo cargar el archivo .env');
    return false;
  }
}

/**
 * Validates required environment variables
 */
export function validateEnvVariables() {
  const requiredVars = ['IBM_API_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`Error: Las siguientes variables de entorno son requeridas: ${missing.join(', ')}`);
    console.log('\nPor favor, sigue estos pasos para configurar las variables faltantes:');
    console.log('1. Abre el archivo .env en la raíz del proyecto');
    console.log('2. Asegúrate de que todas las variables requeridas estén definidas');
    console.log('3. Guarda el archivo y reinicia el bot\n');
    return false;
  }
  
  return true;
}
