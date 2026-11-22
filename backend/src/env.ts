// Debe importarse primero: carga backend/.env antes de que otros módulos lean process.env.
try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usan las variables del sistema (producción).
}
