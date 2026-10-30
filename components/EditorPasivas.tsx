"use client";
import { type ReglaPasiva } from "../lib/pasivas";
const campo =
  "mt-1 w-full rounded border border-neutral-700 bg-black p-2 text-sm";
export function EditorPasivas({
  value,
  onChange,
}: {
  value: ReglaPasiva[];
  onChange: (r: ReglaPasiva[]) => void;
}) {
  const cambiar = (id: string, p: Partial<ReglaPasiva>) =>
    onChange(value.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <section className="space-y-4">
      <div className="flex justify-between">
        <h2>Reglas pasivas automáticas</h2>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...value,
              {
                id: crypto.randomUUID(),
                nombre: "",
                condicion: "siempre",
                evento: "permanente",
                bonos: {},
                curacion: 0,
                recuperar_ph: 0,
                reducir_fatiga: 0,
              },
            ])
          }
        >
          + Añadir regla
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Las reglas se calculan por sus campos. La mayor reducción porcentual
        prevalece; la misma regla no se duplica.
      </p>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              nombre: "Escamas de dragón",
              condicion: "ataque_magico",
              evento: "recibir_ataque",
              bonos: { armadura: 5 },
              reduccion_pct: 50,
              curacion: 0,
              recuperar_ph: 0,
              reducir_fatiga: 0,
            },
          ])
        }
      >
        + Ejemplo: Escamas de dragón
      </button>
      {value.map((r) => (
        <div
          key={r.id}
          className="space-y-3 rounded border border-neutral-800 p-4"
        >
          <label className="block">
            Nombre
            <input
              className={campo}
              value={r.nombre}
              onChange={(e) => cambiar(r.id, { nombre: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Condición
              <select
                className={campo}
                value={r.condicion}
                onChange={(e) => {
                  const condicion = e.target.value as ReglaPasiva["condicion"];
                  cambiar(r.id, {
                    condicion,
                    ...(condicion.startsWith("ataque_") &&
                    ["permanente", "inicio_turno"].includes(r.evento)
                      ? { evento: "recibir_ataque" as const }
                      : {}),
                  });
                }}
              >
                {Object.entries({
                  siempre: "Siempre",
                  vida_mitad: "Vida a mitad o menos",
                  sin_arma: "Sin arma",
                  ataque_magico: "Ataque que consume PH",
                  ataque_natural: "Ataque natural sin PH",
                  ataque_elemental: "Ataque elemental",
                }).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Momento
              <select
                className={campo}
                value={r.evento}
                onChange={(e) =>
                  cambiar(r.id, {
                    evento: e.target.value as ReglaPasiva["evento"],
                  })
                }
              >
                {Object.entries({
                  permanente: "Bono permanente",
                  inicio_turno: "Inicio del turno",
                  recibir_ataque: "Antes de comprobar impacto",
                  recibir_impacto: "Cuando un ataque impacta",
                  recibir_dano: "Cuando recibe daño",
                }).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {r.evento === "permanente" ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                "vida",
                "armadura",
                "ph",
                "fatiga",
                "iniciativa",
                "bono_impacto",
                "dano",
                "salvacion",
              ].map((k) => (
                <label key={k}>
                  {k}
                  <input
                    type="number"
                    className={campo}
                    value={r.bonos[k] || 0}
                    onChange={(e) =>
                      cambiar(r.id, {
                        bonos: { ...r.bonos, [k]: Number(e.target.value) },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {(["curacion", "recuperar_ph", "reducir_fatiga"] as const).map(
                  (k) => (
                    <label key={k}>
                      {k}
                      <input
                        type="number"
                        min="0"
                        className={campo}
                        value={r[k]}
                        onChange={(e) =>
                          cambiar(r.id, { [k]: Number(e.target.value) })
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              {r.evento !== "inicio_turno" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    Elemento recibido
                    <select
                      className={campo}
                      value={r.elemento || "cualquiera"}
                      onChange={(e) =>
                        cambiar(r.id, { elemento: e.target.value })
                      }
                    >
                      {[
                        "cualquiera",
                        "fuego",
                        "agua",
                        "electricidad",
                        "hielo",
                        "luz_sagrada",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  {r.evento === "recibir_ataque" && (
                    <label>
                      ARM solo contra este ataque
                      <input
                        type="number"
                        className={campo}
                        value={r.bonos.armadura || 0}
                        onChange={(e) =>
                          cambiar(r.id, {
                            bonos: {
                              ...r.bonos,
                              armadura: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  )}
                  <label>
                    Reducción de daño (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className={campo}
                      value={r.reduccion_pct || 0}
                      onChange={(e) =>
                        cambiar(r.id, { reduccion_pct: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Dados de represalia
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className={campo}
                      value={r.represalia_dados || 0}
                      onChange={(e) =>
                        cambiar(r.id, {
                          represalia_dados: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Caras de represalia
                    <input
                      type="number"
                      min="2"
                      max="1000"
                      className={campo}
                      value={r.represalia_caras || 6}
                      onChange={(e) =>
                        cambiar(r.id, {
                          represalia_caras: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <p className="text-xs text-neutral-500">
                    Las represalias no encadenan nuevas represalias. El bono ARM
                    se aplica únicamente antes del impacto.
                  </p>
                </div>
              )}
            </>
          )}
          <button
            type="button"
            className="text-red-300"
            onClick={() => onChange(value.filter((v) => v.id !== r.id))}
          >
            Quitar regla
          </button>
        </div>
      ))}
    </section>
  );
}
