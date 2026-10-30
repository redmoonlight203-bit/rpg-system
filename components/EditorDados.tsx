"use client";
import { elementoDe } from "../lib/combate";
import { useState } from "react";
import {
  type Efecto,
  ELEMENTOS,
  formula,
  nuevoEfecto,
  validarEfectos,
} from "../lib/creacion";
const campo =
  "w-full rounded border border-neutral-700 bg-black p-2 text-sm text-neutral-100";
export function EditorDados({
  value,
  onChange,
  disabled = false,
}: {
  value: Efecto[];
  onChange: (e: Efecto[]) => void;
  disabled?: boolean;
}) {
  const [prueba, setPrueba] = useState("");
  function cambiar(id: string, patch: Partial<Efecto>) {
    onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setPrueba("");
  }
  function tirar(e: Efecto) {
    const error = validarEfectos([e]);
    if (error) {
      setPrueba(error);
      return;
    }
    const rolls = Array.from({ length: e.cantidad }, () => {
      const a = new Uint32Array(1);
      const limite = Math.floor(4294967296 / e.caras) * e.caras;
      do {
        crypto.getRandomValues(a);
      } while (a[0] >= limite);
      return (a[0] % e.caras) + 1;
    });
    const total = rolls.reduce((a, b) => a + b, 0) + e.modificador;
    setPrueba(
      `${e.nombre}: [${rolls.join(", ")}] ${e.modificador >= 0 ? "+" : ""}${e.modificador} = ${total}. Prueba sin aplicar cambios ni gastar PH.`,
    );
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dados y efectos</h2>
          <p className="text-sm text-neutral-400">
            Configura cada acción: daño, curación, recuperación o estado.
          </p>
        </div>
        <button
          disabled={disabled || value.length >= 20}
          type="button"
          onClick={() => onChange([...value, nuevoEfecto()])}
          className="rounded border border-orange-800 px-3 py-2 text-sm"
        >
          + Agregar acción
        </button>
      </div>
      {!value.length && (
        <p className="text-sm text-neutral-500">
          Sin acciones con dados. Una armadura ordinaria puede funcionar solo
          con sus atributos.
        </p>
      )}
      {value.map((e) => (
        <fieldset
          disabled={disabled}
          key={e.id}
          className="space-y-3 rounded-lg border border-neutral-800 p-4"
        >
          <legend className="px-2 text-orange-300">
            {e.nombre || "Nueva acción"} ·{" "}
            {e.efecto === "estado" ? "Estado" : formula(e)}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Nombre
              <input
                maxLength={120}
                className={campo}
                value={e.nombre}
                onChange={(v) => cambiar(e.id, { nombre: v.target.value })}
                placeholder="Bola de fuego, curación…"
              />
            </label>
            <label className="text-sm">
              Efecto
              <select
                className={campo}
                value={e.efecto}
                onChange={(v) =>
                  cambiar(e.id, { efecto: v.target.value as Efecto["efecto"] })
                }
              >
                <option value="dano">Causar daño</option>
                <option value="curacion">Curar vida</option>
                <option value="recuperar_ph">Recuperar PH</option>
                <option value="reducir_fatiga">Reducir Fatiga</option>
                <option value="estado">Aplicar estado</option>
                <option value="crear_arma">Crear arma temporal</option>
              </select>
            </label>
          </div>
          {e.efecto !== "estado" && (
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                Cantidad de dados
                <input
                  className={campo}
                  type="number"
                  min="0"
                  max="100"
                  value={e.cantidad}
                  onChange={(v) =>
                    cambiar(e.id, { cantidad: Number(v.target.value) })
                  }
                />
              </label>
              <label className="text-sm">
                Caras del dado
                <select
                  className={campo}
                  value={e.caras}
                  onChange={(v) =>
                    cambiar(e.id, { caras: Number(v.target.value) })
                  }
                >
                  {[...new Set([4, 6, 8, 10, 12, 20, 100, e.caras])]
                    .sort((a, b) => a - b)
                    .map((n) => (
                      <option key={n} value={n}>
                        d{n}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Modificador
                <input
                  className={campo}
                  type="number"
                  value={e.modificador}
                  onChange={(v) =>
                    cambiar(e.id, { modificador: Number(v.target.value) })
                  }
                />
              </label>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Coste en PH
              <input
                type="number"
                min="0"
                className={campo}
                value={e.coste_ph}
                onChange={(v) =>
                  cambiar(e.id, { coste_ph: Number(v.target.value) })
                }
              />
            </label>
            <label className="text-sm">
              Duración en turnos (0 = inmediato)
              <input
                type="number"
                min="0"
                className={campo}
                value={e.duracion}
                onChange={(v) =>
                  cambiar(e.id, { duracion: Number(v.target.value) })
                }
              />
            </label>
          </div>
          <label className="block text-sm">
            Coste de Fatiga
            <input
              type="number"
              min="0"
              className={campo}
              value={e.coste_fatiga || 0}
              onChange={(v) =>
                cambiar(e.id, { coste_fatiga: Number(v.target.value) })
              }
            />
          </label>
          {e.efecto === "crear_arma" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Nombre del arma
                <input
                  className={campo}
                  value={e.arma_nombre || ""}
                  onChange={(v) =>
                    cambiar(e.id, { arma_nombre: v.target.value })
                  }
                />
              </label>
              <label>
                Mano
                <select
                  className={campo}
                  value={e.arma_slot || "mano_der"}
                  onChange={(v) =>
                    cambiar(e.id, {
                      arma_slot: v.target.value as Efecto["arma_slot"],
                    })
                  }
                >
                  <option value="mano_der">Derecha</option>
                  <option value="mano_izq">Izquierda</option>
                  <option value="dos_manos">Dos manos</option>
                </select>
              </label>
              <p className="text-xs text-neutral-500 sm:col-span-2">
                Los dados definen el ataque. La duración cuenta turnos propios
                completos posteriores a la creación; al expirar se restaura el
                equipo anterior.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Naturaleza
              <select
                className={campo}
                value={e.naturaleza || "automatica"}
                onChange={(v) =>
                  cambiar(e.id, {
                    naturaleza: v.target.value as Efecto["naturaleza"],
                    ...(v.target.value === "magica"
                      ? { coste_ph: Math.max(1, e.coste_ph) }
                      : v.target.value === "natural"
                        ? {
                            coste_ph: 0,
                            coste_fatiga: Math.max(1, e.coste_fatiga || 0),
                          }
                        : v.target.value === "fisica"
                          ? { coste_ph: 0, coste_fatiga: 0 }
                          : {}),
                  })
                }
              >
                <option value="automatica">Automática según PH / Fatiga</option>
                <option value="fisica">Física</option>
                <option value="magica">Mágica</option>
                <option value="natural">Natural</option>
              </select>
            </label>
            <label>
              Elemento
              <select
                className={campo}
                value={elementoDe(e)}
                onChange={(v) =>
                  cambiar(e.id, {
                    elemento: v.target.value as Efecto["elemento"],
                  })
                }
              >
                {ELEMENTOS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo de daño
              <input
                className={campo}
                value={e.tipo_dano}
                onChange={(v) => cambiar(e.id, { tipo_dano: v.target.value })}
                placeholder="Cortante, perforante…"
              />
            </label>
          </div>
          <p className="text-xs text-neutral-500">
            Cada ataque elemental añade 1d4. Fuego, Hielo y Luz aplican sus
            salvaciones CD 12. Los ataques que gastan PH activan las defensas
            contra magia.
          </p>
          <label className="block">
            <input
              type="checkbox"
              checked={!!e.salvacion}
              onChange={(v) =>
                cambiar(e.id, {
                  salvacion: v.target.checked
                    ? { cd: 12, atributo: "salvacion", exito: "mitad" }
                    : undefined,
                })
              }
            />{" "}
            Salvación de la acción (sustituye la tirada de impacto)
          </label>
          {e.salvacion && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                Dificultad
                <input
                  className={campo}
                  type="number"
                  min="1"
                  max="1000"
                  value={e.salvacion.cd}
                  onChange={(v) =>
                    cambiar(e.id, {
                      salvacion: {
                        ...e.salvacion!,
                        cd: Number(v.target.value),
                      },
                    })
                  }
                />
              </label>
              <label>
                Clave del bono
                <input
                  className={campo}
                  value={e.salvacion.atributo}
                  onChange={(v) =>
                    cambiar(e.id, {
                      salvacion: { ...e.salvacion!, atributo: v.target.value },
                    })
                  }
                />
              </label>
              <label>
                Al superarla
                <select
                  className={campo}
                  value={e.salvacion.exito}
                  onChange={(v) =>
                    cambiar(e.id, {
                      salvacion: {
                        ...e.salvacion!,
                        exito: v.target.value as
                          "mitad" | "anula" | "solo_estado",
                      },
                    })
                  }
                >
                  <option value="mitad">Mitad de daño</option>
                  <option value="anula">Anula la acción</option>
                  <option value="solo_estado">
                    Evita el estado, mantiene daño
                  </option>
                </select>
              </label>
            </div>
          )}
          {e.efecto === "estado" && (
            <label>
              Estado automático
              <select
                className={campo}
                value={e.estado_tipo || "narrativo"}
                onChange={(v) =>
                  cambiar(e.id, {
                    estado_tipo: v.target.value as Efecto["estado_tipo"],
                  })
                }
              >
                {[
                  "narrativo",
                  "veneno",
                  "regeneracion",
                  "aturdido",
                  "quemadura",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          {e.efecto === "estado" &&
            ["veneno", "regeneracion", "quemadura"].includes(
              e.estado_tipo || "",
            ) && (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  Dados por inicio de turno
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className={campo}
                    value={e.cantidad}
                    onChange={(v) =>
                      cambiar(e.id, { cantidad: Number(v.target.value) })
                    }
                  />
                </label>
                <label>
                  Caras
                  <input
                    type="number"
                    min="2"
                    max="1000"
                    className={campo}
                    value={e.caras}
                    onChange={(v) =>
                      cambiar(e.id, { caras: Number(v.target.value) })
                    }
                  />
                </label>
              </div>
            )}

          {e.efecto === "estado" && (
            <div className="grid grid-cols-3 gap-3">
              {["armadura", "bono_impacto", "dano"].map((k) => (
                <label key={k}>
                  Bono {k}
                  <input
                    type="number"
                    className={campo}
                    value={e.bonos_estado?.[k] || 0}
                    onChange={(v) =>
                      cambiar(e.id, {
                        bonos_estado: {
                          ...e.bonos_estado,
                          [k]: Number(v.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          )}
          {e.efecto === "estado" && (
            <label className="block text-sm">
              Estado y efecto
              <textarea
                maxLength={1000}
                className={campo}
                value={e.estado}
                onChange={(v) => cambiar(e.id, { estado: v.target.value })}
                placeholder="Describe qué provoca y cuándo termina"
              />
            </label>
          )}
          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v.id !== e.id))}
              className="text-red-300"
            >
              Quitar acción
            </button>
            {e.efecto !== "estado" && (
              <button type="button" onClick={() => tirar(e)}>
                Probar {formula(e)}
              </button>
            )}
          </div>
        </fieldset>
      ))}
      {prueba && (
        <p role="status" className="text-sm text-amber-200">
          {prueba}
        </p>
      )}
    </section>
  );
}
