import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const exports = {};
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../lib/combate.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  { exports, crypto, JSON, Array, Object, Math, Number, Map },
);
const c = exports;
const e = (patch = {}) => ({
  id: "e",
  nombre: "Prueba",
  efecto: "dano",
  cantidad: 1,
  caras: 6,
  modificador: 2,
  coste_ph: 0,
  duracion: 0,
  tipo_dano: "fisico",
  estado: "",
  ...patch,
});
function campo(efecto = e()) {
  let b = c.nuevoCombate();
  for (const [id, d, bando] of [
    ["a", 20, "jugador"],
    ["b", 10, "enemigo"],
    ["c", 1, "enemigo"],
  ])
    b = c.agregar(
      b,
      {
        id,
        forja_id: null,
        nombre: id,
        stats: { vida: 100, armadura: 20, ph: 20, fatiga: 7 },
        configuracion: {
          tipo_creacion: "personaje",
          habilidades: [
            { id: "h", nombre: "Prueba", stats: {}, efectos: [efecto] },
          ],
        },
      },
      bando,
      () => d,
    );
  b.regla = "directo";
  return c.iniciar(b);
}
function rng(...valores) {
  return (caras) => {
    assert.ok(valores.length, "Falta valor para d" + caras);
    const v = valores.shift();
    assert.ok(v >= 1 && v <= caras, `d${caras} recibió ${v}`);
    return v;
  };
}
const atacar = (b, ...vs) => c.actuar(b, "a", "hab:h:e", "b", rng(...vs));
const estado = (b, tipo, patch = {}) =>
  b.miembros[1].estados.push({
    id: tipo,
    tipo,
    nombre: tipo,
    restantes: 0,
    creado: 0,
    bonos: {},
    ...patch,
  });
const r = (patch = {}) => ({
  id: "escamas",
  nombre: "Escamas",
  condicion: "ataque_magico",
  evento: "recibir_ataque",
  bonos: { armadura: 5 },
  reduccion_pct: 50,
  curacion: 0,
  recuperar_ph: 0,
  reducir_fatiga: 0,
  ...patch,
});
test("crítico duplica dados y suma modificadores una vez", () => {
  const b = campo();
  b.regla = "impacto";
  b.miembros[0].stats.dano = 3;
  const n = atacar(b, 20, 4);
  assert.equal(n.miembros[1].vida, 87);
});
test("Escamas da ARM temporal contra PH, luego mitad de daño", () => {
  const b = campo(e({ coste_ph: 1 }));
  b.miembros[1].configuracion.reglas_pasivas = [r()];
  b.miembros[0].stats.bono_impacto = 10;
  b.regla = "impacto";
  assert.equal(atacar(b, 14).resultado, "Fallo");
  const n = atacar(b, 15, 5);
  assert.equal(n.miembros[1].vida, 97);
  assert.equal(c.estadisticas(n.miembros[1]).armadura, 20);
});
test("Escamas no se activa ante ataques sin PH aunque el texto diga mágico", () => {
  const b = campo(e({ naturaleza: "magica" }));
  b.miembros[1].configuracion.reglas_pasivas = [r()];
  assert.equal(atacar(b, 5).miembros[1].vida, 93);
});
test("reducciones usan la mayor y reglas duplicadas no se duplican", () => {
  const b = campo(e({ coste_ph: 1 }));
  b.miembros[1].configuracion.reglas_pasivas = [
    r(),
    r(),
    r({ id: "otra", reduccion_pct: 25 }),
  ];
  assert.equal(atacar(b, 6).miembros[1].vida, 96);
});
test("recibir impacto y recibir daño no se disparan al fallar", () => {
  const b = campo();
  b.regla = "impacto";
  b.miembros[1].configuracion.reglas_pasivas = [
    r({
      condicion: "siempre",
      evento: "recibir_impacto",
      represalia_dados: 1,
      represalia_caras: 4,
    }),
  ];
  assert.equal(atacar(b, 1).miembros[0].vida, 100);
  assert.equal(atacar(b, 20, 2, 3).miembros[0].vida, 97);
});
test("Fuego: añade d4, quema al fallar y vuelve a salvar tras daño inicial", () => {
  const n = atacar(campo(e({ elemento: "fuego" })), 6, 4, 1);
  assert.equal(n.miembros[1].vida, 88);
  assert.ok(n.miembros[1].estados.some((e) => e.tipo === "quemadura"));
  const t = c.siguiente(n, rng(4, 12));
  assert.equal(t.miembros[1].vida, 84);
  assert.ok(!t.miembros[1].estados.some((e) => e.tipo === "quemadura"));
});
test("Agua aplica Mojado sin salvación", () => {
  const n = atacar(campo(e({ elemento: "agua" })), 6, 4);
  assert.equal(n.miembros[1].vida, 88);
  assert.ok(n.miembros[1].estados.some((e) => e.tipo === "mojado"));
});
test("Onda de vapor consume Mojado, añade d4 y ciega el siguiente ataque", () => {
  const b = campo(e({ elemento: "fuego" }));
  estado(b, "mojado");
  const n = atacar(b, 6, 4, 3, 12);
  assert.equal(n.miembros[1].vida, 85);
  assert.ok(!n.miembros[1].estados.some((e) => e.tipo === "mojado"));
  assert.equal(c.estadisticas(n.miembros[1]).bono_impacto, -4);
  n.actual = "b";
  n.miembros[1].accion_usada = false;
  n.regla = "impacto";
  const t = c.actuar(n, "b", "ataque", "a", rng(1));
  assert.equal(c.estadisticas(t.miembros[1]).bono_impacto || 0, 0);
});
test("Congelación pierde un turno y Escarcha se aplica si falla CD12", () => {
  const b = campo(e({ elemento: "hielo" }));
  estado(b, "mojado");
  const n = atacar(b, 6, 4, 1);
  assert.ok(n.miembros[1].estados.some((e) => e.tipo === "escarcha"));
  const t = c.siguiente(n);
  assert.equal(t.actual, "b");
  assert.equal(t.miembros[1].accion_usada, true);
  assert.throws(() => c.actuar(t, "b", "ataque", "a"), /acción/);
});
test("Escarcha divide ARM hasta el siguiente ataque incluso si falla", () => {
  const b = campo();
  b.regla = "impacto";
  estado(b, "escarcha");
  const n = atacar(b, 10, 4);
  assert.equal(n.resultado, "Impacto");
  assert.ok(!n.miembros[1].estados.some((e) => e.tipo === "escarcha"));
  const f = atacar(b, 2);
  assert.ok(!f.miembros[1].estados.some((e) => e.tipo === "escarcha"));
});
test("Electricidad ignora 3 ARM y chispa solo afecta a cercanos", () => {
  const b = campo(e({ elemento: "electricidad" }));
  b.regla = "impacto";
  b.miembros[1].grupo_cercania = "A";
  b.miembros[2].grupo_cercania = "A";
  const n = atacar(b, 17, 6, 4);
  assert.equal(n.resultado, "Impacto");
  assert.equal(n.miembros[2].vida, 97);
  b.miembros[2].grupo_cercania = "";
  assert.equal(atacar(b, 17, 6, 4).miembros[2].vida, 100);
});
test("Superconducción duplica daño principal y añade d6 a mojados cercanos", () => {
  const b = campo(e({ elemento: "electricidad" }));
  estado(b, "mojado");
  b.miembros[1].grupo_cercania = "A";
  b.miembros[2].grupo_cercania = "A";
  b.miembros[2].estados.push({
    id: "mojado",
    tipo: "mojado",
    nombre: "Mojado",
    restantes: 0,
    creado: 0,
    bonos: {},
  });
  const n = atacar(b, 6, 4, 5);
  assert.equal(n.miembros[1].vida, 76);
  assert.equal(n.miembros[2].vida, 92);
  assert.ok(!n.miembros[1].estados.some((e) => e.tipo === "mojado"));
});
test("Agua bendita añade d6 y duplica contra corrupción", () => {
  const b = campo(e({ elemento: "luz_sagrada" }));
  estado(b, "mojado");
  b.miembros[1].corrupto = true;
  const n = atacar(b, 6, 4, 5, 12);
  assert.equal(n.miembros[1].vida, 66);
});
test("Luz ignora 5 ARM, marca al fallar y la marca estalla una sola vez", () => {
  const b = campo(e({ elemento: "luz_sagrada" }));
  b.regla = "impacto";
  const n = atacar(b, 15, 6, 4, 1);
  assert.ok(n.miembros[1].estados.some((e) => e.tipo === "marca_luz"));
  n.actual = "a";
  n.miembros[0].accion_usada = false;
  n.miembros[0].configuracion.habilidades[0].efectos = [e()];
  const t = atacar(n, 20, 2, 5);
  assert.equal(t.miembros[1].vida, 72);
  assert.ok(!t.miembros[1].estados.some((e) => e.tipo === "marca_luz"));
});
test("salvación configurable reemplaza impacto y reduce daño al superar", () => {
  const b = campo(
    e({ salvacion: { cd: 12, atributo: "salvacion", exito: "mitad" } }),
  );
  b.miembros[1].stats.salvacion = 2;
  const n = atacar(b, 10, 6);
  assert.equal(n.miembros[1].vida, 96);
});
test("renovar Mojado no lo apila", () => {
  const b = campo(e({ elemento: "agua" }));
  estado(b, "mojado");
  assert.equal(
    atacar(b, 1, 1).miembros[1].estados.filter((e) => e.tipo === "mojado")
      .length,
    1,
  );
});
test("veneno y regeneración actúan al inicio y caducan", () => {
  const b = campo();
  b.miembros[1].vida = 50;
  estado(b, "veneno", { restantes: 1, cantidad: 1, caras: 4 });
  estado(b, "regeneracion", { restantes: 1, cantidad: 1, caras: 6 });
  const n = c.siguiente(b, rng(3, 5));
  assert.equal(n.miembros[1].vida, 52);
  const t = c.siguiente(n);
  assert.equal(t.miembros[1].estados.length, 0);
});
test("agotamiento no se recupera pasando; forzar causa daño y descanso lo elimina", () => {
  const b = campo(e({ coste_fatiga: 1, naturaleza: "natural" }));
  b.miembros[0].fatiga = 7;
  b.miembros[0].agotado = true;
  assert.throws(() => atacar(b, 3), /Agotamiento/);
  const n = c.actuar(b, "a", "hab:h:e", "b", rng(4, 6), true);
  assert.equal(n.miembros[0].vida, 96);
  assert.equal(c.siguiente(n).miembros[0].fatiga, 7);
  assert.throws(() => c.descansar(n), /terminar/);
  const t = c.descansar(c.finalizar(n));
  assert.equal(t.miembros[0].fatiga, 0);
  assert.equal(t.miembros[0].agotado, false);
});
test("deshacer restaura daño, PH, estados, turno y enfriamiento", () => {
  const b = campo(e({ elemento: "fuego", coste_ph: 2 }));
  b.miembros[0].configuracion.habilidades[0].stats.enfriamiento = 2;
  const n = atacar(b, 6, 4, 1),
    t = c.deshacer(n);
  assert.equal(t.miembros[1].vida, 100);
  assert.equal(t.miembros[1].estados.length, 0);
  assert.equal(t.miembros[0].ph, 20);
  assert.equal(t.miembros[0].accion_usada, false);
  assert.equal(t.miembros[0].cooldowns["hab:h:e"], undefined);
  assert.equal(t.actual, "a");
  assert.equal(b.miembros[1].vida, 100);
});
test("salvación solo_estado evita secundarios pero mantiene daño elemental", () => {
  const b = campo(
    e({
      elemento: "hielo",
      salvacion: { cd: 12, atributo: "salvacion", exito: "solo_estado" },
    }),
  );
  estado(b, "mojado");
  const n = atacar(b, 12, 6, 4);
  assert.equal(n.miembros[1].vida, 88);
  assert.equal(n.miembros[1].estados.length, 0);
});
test("deshacer también restaura el turno y el daño periódico al avanzar", () => {
  const b = campo();
  estado(b, "quemadura", { cantidad: 1, caras: 4, cd: 12 });
  const n = c.siguiente(b, rng(4, 1)),
    t = c.deshacer(n);
  assert.equal(n.actual, "b");
  assert.equal(n.miembros[1].vida, 96);
  assert.equal(t.actual, "a");
  assert.equal(t.miembros[1].vida, 100);
  assert.equal(t.miembros[1].estados.length, 1);
});
test("una defensa de Recibir daño no cura si absorbe todo el daño", () => {
  const b = campo();
  b.miembros[1].vida = 50;
  b.miembros[1].configuracion.reglas_pasivas = [
    r({
      condicion: "siempre",
      evento: "recibir_dano",
      reduccion_pct: 100,
      curacion: 10,
    }),
  ];
  const n = atacar(b, 6);
  assert.equal(n.miembros[1].vida, 50);
});
test("recuperación antes de recibir ataque sucede antes del daño", () => {
  const b = campo();
  b.miembros[1].vida = 98;
  b.miembros[1].configuracion.reglas_pasivas = [
    r({ condicion: "siempre", curacion: 10, reduccion_pct: 0, bonos: {} }),
  ];
  const n = atacar(b, 6);
  assert.equal(n.miembros[1].vida, 92);
});
test('terminar consume Mojado y deshacer devuelve los estados del combate',()=>{const b=campo();estado(b,'mojado');const n=c.finalizar(b);assert.equal(n.miembros[1].estados.length,0);assert.equal(c.deshacer(n).miembros[1].estados[0].tipo,'mojado');});
