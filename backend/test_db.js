const pool = require('./db');

async function probarConexion() {
  try {
    const resultado = await pool.query(
      'SELECT * FROM empleados'
    );

    console.log('✅ Conexión exitosa a PostgreSQL');
    console.log('Empleados:', resultado.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);

  } finally {
    await pool.end();
  }
}

probarConexion();