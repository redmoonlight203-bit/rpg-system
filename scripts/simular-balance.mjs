// Repite una exportación de La Forja o ejecuta el ejemplo de coste del plan.
import { readFileSync } from 'node:fs';
import { cargarDependencia } from '../tests/helpers/cargar-ts.mjs';

const { evaluarBalance } = cargarDependencia('balance-laboratorio');
const { vacio } = cargarDependencia('yunque-borrador');

if (process.argv[2]) {
  const { entrada } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (!Array.isArray(entrada) || entrada.length !== 3) throw Error('El archivo debe ser una prueba exportada del laboratorio.');
  console.log(JSON.stringify(evaluarBalance(...entrada), null, 2));
} else {
  const opciones = { repeticiones: 24, doll: { ph: 2 } };
  const contexto = { creaciones: [], stats: {} };
  function probar(coste) {
    const borrador = {
      ...vacio(), id: 'ensayo', tipo: 'habilidad', nombre: 'Golpe de prueba',
      efectos: [{ id: 'golpe', nombre: 'Golpe', efecto: 'dano', cantidad: 2, caras: 6, modificador: 0,
        tipo_dano: 'físico', estado: '', duracion: 0, coste_ph: coste, animacion: 'impacto' }],
    };
    return evaluarBalance(borrador, contexto, opciones);
  }
  console.log(JSON.stringify({ sinCoste: probar(0), conCoste: probar(2) }, null, 2));
}
