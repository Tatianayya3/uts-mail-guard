# Minería de datos · Mail Guard + RapidMiner

**Objetivo:** predecir el **veredicto** de un correo (`seguro`, `sospechoso`, `peligroso`) a partir
de las características que Mail Guard extrae del mensaje.

**Herramientas:** RapidMiner / Altair AI Studio 12.1 · Supabase (PostgreSQL) · panel web de Mail Guard.

## Resultados

| Métrica (20 % de prueba, 16.001 correos) | Valor       |
| ---------------------------------------- | ----------- |
| Exactitud (accuracy)                     | **94,31 %** |
| Kappa                                    | 0,897       |
| Error de clasificación                   | 5,69 %      |
| Recall promedio ponderado                | 92,21 %     |
| Precisión promedio ponderada             | 91,87 %     |

| Real ↓ / Predicho → | Seguro    | Sospechoso | Peligroso |
| ------------------- | --------- | ---------- | --------- |
| **Seguro**          | **9.407** | 224        | 0         |
| **Sospechoso**      | 189       | **3.512**  | 269       |
| **Peligroso**       | 1         | 227        | **2.172** |

Solo 1 correo peligroso se clasificó como seguro: los errores ocurren casi siempre entre clases vecinas.

## Archivos

| Archivo                         | Qué es                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `generar-dataset.ts`            | Genera los 100.000 registros sintéticos (semilla fija → siempre iguales).     |
| `cargar-supabase.ts`            | Sube el CSV a la tabla `mineria_correos`.                                     |
| `mail-guard-mineria.rmp`        | Proceso de RapidMiner listo para importar.                                    |
| `../supabase/migrations/0003_*` | Tablas `mineria_*` y rol `mineria`.                                           |
| `../supabase/migrations/0004_*` | Función `mineria_resumen()` que alimenta el panel web.                        |
| Panel web → **Minería**         | `apps/extension-dashboard/src/app/dashboard/mineria` (fase de visualización). |

## Reproducirlo desde cero

```bash
bun mineria-datos/generar-dataset.ts                                   # 1. dataset (CSV, 11 MB)
# 2. aplicar supabase/migrations/0003 y 0004 en el SQL Editor y fijar la contraseña:
#    alter role mineria password '...';
# 3. mineria-datos/.env  →  DATABASE_URL=postgresql://mineria.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:5432/postgres
bun --env-file=mineria-datos/.env mineria-datos/cargar-supabase.ts      # 4. carga
```

5. En RapidMiner: **Connections → Create Connection** → `Local Repository`, nombre `supabase-mineria`,
   tipo **Database**: PostgreSQL · host `aws-0-us-east-2.pooler.supabase.com` · puerto `5432` ·
   base `postgres` · usuario `mineria.<project_ref>` · contraseña del rol. **Test Connection** → Save.
6. **File → Import Process…** → `mail-guard-mineria.rmp` → ▶ Run.

---

## Composición del dataset (100.000 registros)

| Parte       | Filas  | Cómo se generó                                                                 |
| ----------- | ------ | ------------------------------------------------------------------------------ |
| Limpios     | 80.000 | Perfil distinto por clase, con solapamiento para que el modelo no sea trivial. |
| Outliers    | 10.000 | Una o dos variables con valores extremos o imposibles.                         |
| Vacíos      | 4.000  | Celdas vacías → `NULL` real en PostgreSQL.                                     |
| Nulos texto | 3.000  | El texto literal `NULL` (hay que declararlo faltante en RapidMiner).           |
| Duplicados  | 3.000  | Copias exactas de registros limpios.                                           |

Variables: `proveedor`, `tipo_dominio`, `longitud_asunto`, `longitud_cuerpo`, `num_enlaces`,
`enlaces_acortados`, `enlaces_con_ip`, `dominio_imita_marca`, `usa_punycode`, `palabras_urgencia`,
`solicita_credenciales`, `nombre_coincide_dominio`, `tiene_adjunto`, `antiguedad_dominio_dias`,
`hora_envio`, `porcentaje_mayusculas`. Etiqueta: `veredicto`. Se excluyen `id_correo` (ID),
`fecha_analisis` y `dominio_remitente`.

---

## El proceso: 5 fases

```
1. Extracción ─► 2. Depuración ─► 3. Transformación ─► 4. Modelado y validación ─► 5. Carga de resultados
   (Supabase)      100k → 80k        etiqueta e ID         80 % entrena / 20 % prueba     (Supabase → panel web)
```

Cada fase es un **subproceso**: doble clic para entrar y ver sus bloques; la flecha ↑ de arriba
a la izquierda del lienzo vuelve al proceso principal.

### 1 · Extracción (Supabase)

| Bloque                     | Operador      | Configuración                                                             |
| -------------------------- | ------------- | ------------------------------------------------------------------------- |
| Conexión Supabase          | Retrieve      | `//Local Repository/Connections/supabase-mineria`                         |
| Limpiar resultados previos | Execute SQL   | `truncate public.mineria_predicciones; truncate public.mineria_metricas;` |
| Leer 100.000 correos       | Read Database | `select … from public.mineria_correos`                                    |

El Execute SQL va **encadenado** antes del Read Database (pasa la conexión): así siempre corre
primero. Si quedara suelto, RapidMiner podría ejecutarlo al final y borrar los resultados recién escritos.

### 2 · Depuración

| Bloque                      | Operador              | Configuración                                                   | Filas      |
| --------------------------- | --------------------- | --------------------------------------------------------------- | ---------- |
| Eliminar duplicados         | Remove Duplicates     | attribute filter type `all`                                     | 97.000     |
| Declarar NULL como faltante | Declare Missing Value | filter `value_type` = `nominal` · mode `nominal` · valor `NULL` | 97.000     |
| Filtrar vacíos y nulos      | Filter Examples       | condition class `no_missing_attributes`                         | 90.000     |
| Filtrar outliers            | Filter Examples       | `custom_filters`, _match all_, reglas de abajo                  | **80.000** |
| Quitar categorías vacías    | Remove Unused Values  | `all` (borra la categoría «NULL» que ya no tiene filas)         | 80.000     |

| Regla de outlier (se conserva si…)                  |
| --------------------------------------------------- |
| longitud_asunto ≤ 150                               |
| longitud_cuerpo ≤ 5000                              |
| num_enlaces, enlaces_acortados, enlaces_con_ip ≤ 25 |
| palabras_urgencia ≤ 12                              |
| 1 ≤ antiguedad_dominio_dias ≤ 9000                  |
| porcentaje_mayusculas ≤ 100                         |

### 3 · Transformación

| Bloque                         | Operador          | Configuración                                                               |
| ------------------------------ | ----------------- | --------------------------------------------------------------------------- |
| Quitar columnas no predictivas | Select Attributes | type **exclude attributes** · subset: `fecha_analisis`, `dominio_remitente` |
| Definir etiqueta e ID          | Set Role          | set roles: `veredicto` → `label`, `id_correo` → `id`                        |

### 4 · Modelado y validación

| Bloque                            | Operador                     | Configuración                                                         |
| --------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| División 80-20                    | Split Data                   | ratios `0.8` / `0.2` · stratified sampling · semilla 1992             |
| Entrenar árbol de decisión (80 %) | Decision Tree                | criterion `gain_ratio` · maximal depth `10` · poda activada           |
| Predecir prueba (20 %)            | Apply Model                  | `mod` ← árbol · `unl` ← partición 2                                   |
| Evaluar rendimiento               | Performance (Classification) | accuracy, classification error, kappa, weighted mean recall/precision |

Salidas del subproceso: **1** = métricas · **2** = predicciones · **3** = árbol (va a Results).

### 5 · Carga de resultados (Supabase)

| Bloque                   | Operador            | Configuración                                                                                |
| ------------------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| Duplicar rendimiento     | Multiply            | una copia a Results, otra a la base de datos                                                 |
| Rendimiento a tabla      | Performance to Data | —                                                                                            |
| Renombrar métricas       | Rename              | `Criterion` → `criterio`, `Value` → `valor`                                                  |
| Seleccionar métricas     | Select Attributes   | include · `criterio`, `valor`                                                                |
| Guardar métricas         | Write Database      | tabla `mineria_metricas` · append                                                            |
| Renombrar predicciones   | Rename              | `prediction(veredicto)` → `prediction_veredicto`, `confidence(x)` → `confidence_x`           |
| Seleccionar predicciones | Select Attributes   | include · id, veredicto, predicción y las 3 confianzas · ✅ also apply to special attributes |
| Guardar predicciones     | Write Database      | tabla `mineria_predicciones` · append                                                        |

---

## Capturas para el informe

| #   | Archivo                       | Dónde                                                       |
| --- | ----------------------------- | ----------------------------------------------------------- |
| 01  | `01_conexion_supabase.png`    | Test Connection en verde                                    |
| 02  | `02_proceso_5_fases.png`      | Proceso principal (Fit to window)                           |
| 03  | `03_datos_crudos_100000.png`  | Fase 1 → salida a Results → encabezado + pestaña Statistics |
| 04  | `04_fase_depuracion.png`      | Doble clic en «2. Depuración»                               |
| 05  | `05_sin_duplicados_97000.png` | Results de «Eliminar duplicados»                            |
| 06  | `06_sin_faltantes_90000.png`  | Results de «Filtrar vacíos y nulos»                         |
| 07  | `07_reglas_outliers.png`      | Ventana de filtros de «Filtrar outliers»                    |
| 08  | `08_datos_limpios_80000.png`  | Results de «Quitar categorías vacías» + Statistics          |
| 09  | `09_fase_transformacion.png`  | Doble clic en «3. Transformación»                           |
| 10  | `10_fase_modelado.png`        | Doble clic en «4. Modelado y validación»                    |
| 11  | `11_matriz_confusion.png`     | Results → PerformanceVector                                 |
| 12  | `12_arbol_decision.png`       | Results → Tree                                              |
| 13  | `13_fase_carga.png`           | Doble clic en «5. Carga de resultados»                      |
| 14  | `14_grafico_clases.png`       | Results → Visualizations (barras de `veredicto`)            |
| 15  | `15_panel_web_mineria.png`    | `http://localhost:3000/dashboard/mineria`                   |

> Para ver el resultado intermedio de un bloque dentro de un subproceso: conecta su salida al
> puerto `out` libre del borde derecho del subproceso y, en el proceso principal, conecta esa
> salida a `res`. Otra opción: clic derecho en el bloque → **Breakpoint After** y ▶ (la ejecución
> se pausa ahí y muestra los datos; ▶ de nuevo para continuar).

## Notas de versión (RapidMiner 12)

- **Select Attributes** ya no tiene la casilla _invert selection_: usa el parámetro **type**
  (`include attributes` / `exclude attributes`).
- **Set Role** usa una sola lista **set roles** para la etiqueta y los roles adicionales.
- **Performance (Classification)** tiene dos salidas: `per` (métricas) y `exa` (datos con la predicción).
