require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
console.log('FALCON NUEVO - ARCHIVO ACTUALIZADO');
console.log('Archivo ejecutado:', __filename);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Ruta principal
app.get('/', (req, res) => {
  res.send('Servidor FALCON funcionando correctamente');
});

// Obtener empleados desde PostgreSQL
app.get('/api/empleados', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM empleados ORDER BY id'
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al consultar empleados:', error);
    res.status(500).json({
      error: 'Error al obtener empleados'
    });
  }
});

/* Registrar un empleado de prueba */
app.post('/api/empleados', async (req, res) => {
  try {
    const { nombre, puesto } = req.body;

    if (
      typeof nombre !== 'string' ||
      typeof puesto !== 'string' ||
      !nombre.trim() ||
      !puesto.trim() ||
      nombre.trim().length > 100 ||
      puesto.trim().length > 100
    ) {
      return res.status(400).json({
        error: 'Nombre y puesto son obligatorios (máximo 100 caracteres)'
      });
    }

    const resultado = await pool.query(
      `INSERT INTO empleados (nombre, puesto)
       VALUES ($1, $2)
       RETURNING id, nombre, puesto`,
      [nombre.trim(), puesto.trim()]
    );

    res.status(201).json(resultado.rows[0]);

  } catch (error) {
    console.error('Error al registrar empleado:', error.message);

    res.status(500).json({
      error: 'Error al registrar empleado'
    });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor FALCON iniciado en puerto ${PORT}`);
});