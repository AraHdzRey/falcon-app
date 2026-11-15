# Datos dummy de FALCÓN

El seed de desarrollo es 100 % sintético, determinista y exclusivo de
desarrollo/pruebas. No contiene datos de empleados, correos corporativos,
matrículas, CURP, RFC ni cumpleaños reales.

## Contenido

- 7 roles físicos por compatibilidad con la migración original; 6 roles del
  alcance actual se asignan a las cuentas dummy. `director` se conserva sin
  eliminar datos compatibles.
- 20 colaboradores y 20 cuentas (`TI001` a `TI020`).
- Correos reservados `tiNNN@example.test`.
- 6 categorías y 4 estados de queja.
- 20 quejas/sugerencias, incluidas 5 anónimas sin relación con usuario.
- 10 noticias ficticias, 8 activas y 2 inactivas.
- 15 eventos de auditoría sin secretos ni contenido completo de quejas.

Los nombres, puestos, áreas, textos, UUID y fechas son fixtures ficticios. Los
folios son opacos, únicos y no contienen identificadores de empleado.

## Contraseña temporal

El repositorio no define una contraseña demo fija. El operador debe cargarla
en memoria antes del seed:

```powershell
$env:DEMO_PASSWORD = Read-Host 'Contraseña dummy temporal'
npm run db:seed
Remove-Item Env:DEMO_PASSWORD
```

Debe tener entre 12 y 128 caracteres. El seed usa el mismo servicio bcrypt que
la autenticación real y sólo persiste el hash. No escribir la contraseña en
SQL, TypeScript, documentación, historial ni archivos `.env` versionados.

## Regeneración e idempotencia

`npm run db:seed` hace upsert de identificadores estables; repetirlo mantiene
el mismo estado lógico. `npm run db:reset` reconstruye por completo sólo
`falcon_db` o `falcon_test`, después aplica migraciones y el mismo seed.

Validar el resultado con:

```powershell
npm run db:verify
```

La verificación exige conteos exactos, hashes bcrypt, correos `example.test`,
ausencia de columnas CURP/RFC y cero vínculos de identidad en quejas anónimas o
sus eventos de auditoría.

