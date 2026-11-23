-- Ajustes exclusivos de las piezas personales de Kion, conservando sus otros nodos y el arte.
with ajustes as (select key as accion,value as parche from jsonb_each($kion$
{
 "bucle": {
  "estado": "Prisión perceptiva",
  "estado_tipo": "aturdido",
  "duracion": 1,
  "tablero": {
   "forma": "individual",
   "alcance": 10,
   "tamano": 0,
   "afecta": "enemigos"
  }
 },
 "caida-prestada": {
  "efecto": "dano",
  "cantidad": 4,
  "caras": 10,
  "modificador": 8,
  "tablero": {
   "forma": "individual",
   "alcance": 8,
   "tamano": 0,
   "afecta": "enemigos",
   "derribo": "siempre"
  }
 },
 "exclusion": {
  "efecto": "dano",
  "cantidad": 20,
  "caras": 20,
  "modificador": 100,
  "tablero": {
   "forma": "individual",
   "alcance": 12,
   "tamano": 0,
   "afecta": "enemigos"
  },
  "salvacion": {
   "cd": 24,
   "atributo": "salvacion",
   "exito": "mitad"
  }
 },
 "reciprocidad-forzada": {
  "estado": "Vínculo de reciprocidad",
  "duracion": 4,
  "tablero": {
   "forma": "individual",
   "alcance": 10,
   "tamano": 0,
   "afecta": "enemigos"
  }
 },
 "punto-cero": {
  "estado": "Congelación inercial",
  "estado_tipo": "aturdido",
  "duracion": 1,
  "tablero": {
   "forma": "circulo",
   "alcance": 8,
   "tamano": 2,
   "afecta": "enemigos",
   "afecta_lanzador": false
  },
  "recurso": {
   "nombre": "Energía absorbida",
   "inicial": 0,
   "cambio": 12
  }
 },
 "reciproco-absoluto": {
  "reaccion": {
   "forma": "limitless",
   "prioridad": 15,
   "principal": {
    "reducir": {
     "modo": "todo"
    },
    "devolver": {}
   }
  }
 },
 "reaccion-designada": {
  "efecto": "dano",
  "cantidad": 6,
  "caras": 10,
  "modificador": 12,
  "defensa": null,
  "tablero": {
   "forma": "individual",
   "alcance": 12,
   "tamano": 0,
   "afecta": "enemigos",
   "desplazamiento": {
    "tipo": "empujar",
    "casillas": 3,
    "cuando": "siempre"
   }
  }
 },
 "absorcion": {
  "reaccion": {
   "naturaleza": "magica",
   "prioridad": 9,
   "principal": {
    "reducir": {
     "modo": "mitad"
    },
    "reservar": {
     "recurso": "Energía absorbida",
     "proporcion": 1,
     "maximo": 120
    }
   },
   "seguimiento": {
    "reservar": {
     "recurso": "Energía absorbida",
     "proporcion": 1,
     "maximo": 120
    }
   }
  }
 },
 "liberacion": {
  "efecto": "dano",
  "cantidad": 4,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "alcance": 0,
   "tamano": 4,
   "afecta": "enemigos",
   "afecta_lanzador": false,
   "origen_area": "lanzador",
   "desplazamiento": {
    "tipo": "empujar",
    "casillas": 4,
    "cuando": "siempre"
   }
  },
  "recurso": {
   "nombre": "Energía absorbida",
   "inicial": 0,
   "cambio": -1,
   "descargar": true
  }
 },
 "reconstruccion": {
  "cantidad": 5,
  "caras": 8,
  "modificador": 12,
  "tablero": {
   "forma": "individual",
   "alcance": 0,
   "tamano": 0,
   "afecta": "yo"
  }
 },
 "supervelocidad-inercial": {
  "duracion": 4,
  "bonos_estado": {
   "movimiento": 10,
   "bono_impacto": 3
  }
 },
 "superfuerza-inercial": {
  "duracion": 4,
  "bonos_estado": {
   "dano": 12
  }
 },
 "punos-inerciales": {
  "efecto": "dano",
  "cantidad": 3,
  "caras": 8,
  "modificador": 4,
  "tablero": {
   "forma": "individual",
   "alcance": 1,
   "tamano": 0,
   "afecta": "enemigos"
  }
 },
 "golpe-transferencia": {
  "efecto": "dano",
  "cantidad": 4,
  "caras": 8,
  "modificador": 6,
  "tablero": {
   "forma": "individual",
   "alcance": 1,
   "tamano": 0,
   "afecta": "enemigos",
   "desplazamiento": {
    "tipo": "empujar",
    "casillas": 3,
    "cuando": "siempre"
   }
  }
 },
 "martillo-yunque": {
  "efecto": "dano",
  "cantidad": 6,
  "caras": 8,
  "modificador": 8,
  "suelo": true,
  "tablero": {
   "forma": "individual",
   "alcance": 1,
   "tamano": 0,
   "afecta": "enemigos",
   "derribo": "siempre"
  }
 },
 "segundo-impacto": {
  "efecto": "dano",
  "cantidad": 4,
  "caras": 8,
  "modificador": 4,
  "tablero": {
   "forma": "linea",
   "alcance": 4,
   "tamano": 4,
   "afecta": "enemigos",
   "afecta_lanzador": false
  }
 },
 "sentencia-suelo": {
  "efecto": "dano",
  "cantidad": 4,
  "caras": 10,
  "modificador": 0,
  "suelo": true,
  "tablero": {
   "forma": "circulo",
   "alcance": 6,
   "tamano": 3,
   "afecta": "enemigos",
   "afecta_lanzador": false,
   "derribo": "siempre"
  }
 },
 "axioma-talion": {
  "efecto": "dano",
  "cantidad": 10,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 4,
   "alcance": 10,
   "afecta_lanzador": false
  }
 },
 "talion-juicio-absoluto": {
  "efecto": "dano",
  "cantidad": 14,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 5,
   "alcance": 12,
   "afecta_lanzador": false
  }
 },
 "extincion": {
  "efecto": "dano",
  "cantidad": 14,
  "caras": 12,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 4,
   "alcance": 12,
   "afecta_lanzador": false
  }
 },
 "axioma-juicio-tierra": {
  "efecto": "dano",
  "cantidad": 8,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 4,
   "alcance": 8,
   "derribo": "fallo_salvacion",
   "afecta_lanzador": false
  }
 },
 "cataclismo": {
  "efecto": "dano",
  "cantidad": 12,
  "caras": 12,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 6,
   "alcance": 10,
   "derribo": "fallo_salvacion",
   "afecta_lanzador": false
  }
 },
 "supernova": {
  "efecto": "dano",
  "cantidad": 12,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 4,
   "alcance": 12,
   "afecta_lanzador": false
  }
 },
 "singularidad": {
  "efecto": "dano",
  "cantidad": 10,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 3,
   "alcance": 10,
   "desplazamiento": {
    "tipo": "atraer",
    "cuando": "fallo_salvacion",
    "casillas": 3
   },
   "afecta_lanzador": false
  }
 },
 "singularidad-eterna": {
  "efecto": "dano",
  "cantidad": 14,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 5,
   "alcance": 12,
   "desplazamiento": {
    "tipo": "atraer",
    "cuando": "fallo_salvacion",
    "casillas": 3
   },
   "afecta_lanzador": false
  }
 },
 "colision-horizontes": {
  "efecto": "dano",
  "cantidad": 12,
  "caras": 10,
  "modificador": 0,
  "tablero": {
   "forma": "circulo",
   "afecta": "todos",
   "tamano": 4,
   "alcance": 12,
   "desplazamiento": {
    "tipo": "atraer",
    "cuando": "fallo_salvacion",
    "casillas": 3
   },
   "afecta_lanzador": false
  }
 }
}
$kion$::jsonb))
update public.forja_maestra f set configuracion_dados=(select jsonb_agg(case when parche is null then e else jsonb_strip_nulls(e||parche) end order by i) from jsonb_array_elements(f.configuracion_dados) with ordinality a(e,i) left join ajustes on accion=e->>'id') where f.personal_de='aa386a13-fec2-59b5-bd77-1fa6424fec28' and exists(select 1 from jsonb_array_elements(f.configuracion_dados) e join ajustes on accion=e->>'id');
update public.forja_maestra set reglas=coalesce(reglas,'[]'::jsonb)||$r$[{"id":"replica_cinetica","nombre":"Repercutir daño en el vínculo","evento":"recibir_dano","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"condicional","destino":"enemigos","condicion":{"tipo":"siempre"},"exito":[{"tipo":"condicional","destino":"objetivo","condicion":{"tipo":"estado","sujeto":"objetivo","estado":"Vínculo de reciprocidad"},"exito":[{"tipo":"dano","destino":"objetivo","valor":{"evento":true}}],"fallo":[]}],"fallo":[]}],"coste_ph":0,"coste_fatiga":0,"enfriamiento":0,"usos":0,"prioridad":0,"limite_por_turno":1}]$r$::jsonb where id='084a0eaf-98d7-5478-a083-4210077683c8' and personal_de='aa386a13-fec2-59b5-bd77-1fa6424fec28' and not coalesce(reglas,'[]'::jsonb) @> '[{"id":"replica_cinetica"}]';

update public.forja_maestra f set configuracion_dados=(
 select jsonb_agg(case when e->>'id'='comprension-arcana' then e||'{"aprendizaje":{"bono":15,"cd":18},"tablero":{"forma":"individual","alcance":12,"tamano":0,"afecta":"todos"}}'::jsonb else e end order by i)
 from jsonb_array_elements(f.configuracion_dados) with ordinality partes(e,i)
) where f.personal_de='aa386a13-fec2-59b5-bd77-1fa6424fec28' and f.id='ba5bda7e-e1f7-5224-87ee-344007488bee';

-- El proyectil y el aterrizaje se seleccionan por separado en la barra de Kion.
update public.forja_maestra f set configuracion_dados=f.configuracion_dados||jsonb_build_array(
 (select (e-'suelo'-'salvacion')||'{"id":"caida-aterrizar","nombre":"Amortiguar caída","efecto":"estado","estado":"Aterrizaje controlado","aterrizar":true,"tablero":{"forma":"individual","alcance":8,"tamano":0,"afecta":"aliados"}}'::jsonb
  from jsonb_array_elements(f.configuracion_dados) e where e->>'id'='caida-prestada'))
where f.personal_de='aa386a13-fec2-59b5-bd77-1fa6424fec28' and f.configuracion_dados @> '[{"id":"caida-prestada"}]' and not f.configuracion_dados @> '[{"id":"caida-aterrizar"}]';

update public.forja_maestra f set configuracion_dados=f.configuracion_dados||jsonb_build_array(
 (select (e-'tablero')||'{"id":"reaccion-designada-interceptar","nombre":"Desviar impacto","efecto":"estado","estado":"Desvío","reaccion":{"naturaleza":"fisica","forma":"limitless","principal":{"reducir":{"modo":"fijo","valor":12},"devolver":{}}}}'::jsonb
  from jsonb_array_elements(f.configuracion_dados) e where e->>'id'='reaccion-designada'))
where f.personal_de='aa386a13-fec2-59b5-bd77-1fa6424fec28' and f.configuracion_dados @> '[{"id":"reaccion-designada"}]' and not f.configuracion_dados @> '[{"id":"reaccion-designada-interceptar"}]';
