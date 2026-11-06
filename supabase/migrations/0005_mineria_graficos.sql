-- Mail Guard · datos para las gráficas detalladas de la minería (idempotente).
-- Replica las visualizaciones de RapidMiner (dispersión de crudos e histogramas por clase)
-- y añade estadísticas antes/después y la confianza del modelo. Todo se agrega en Postgres:
-- el panel recibe unos pocos miles de puntos, nunca las 100.000 filas.
--
-- Los agregados sobre mineria_correos (~1,6 M valores, medianas incluidas) tardan varios
-- segundos, así que se guardan en una vista materializada. Se refresca al cargar el dataset
-- (cargar-supabase.ts llama a mineria_refrescar_graficos()). La confianza del modelo sí se
-- calcula en vivo porque cambia cada vez que RapidMiner escribe predicciones.

-- Dataset limpio con las mismas reglas que el proceso de RapidMiner y que mineria_resumen().
create or replace view public.mineria_correos_limpios
with (security_invoker = true) as
select distinct id_correo, fecha_analisis, proveedor, dominio_remitente, tipo_dominio,
       longitud_asunto, longitud_cuerpo, num_enlaces, enlaces_acortados, enlaces_con_ip,
       dominio_imita_marca, usa_punycode, palabras_urgencia, solicita_credenciales,
       nombre_coincide_dominio, tiene_adjunto, antiguedad_dominio_dias, hora_envio,
       porcentaje_mayusculas, veredicto
from public.mineria_correos c
where num_nulls(c.id_correo, c.fecha_analisis, c.proveedor, c.dominio_remitente, c.tipo_dominio,
                c.longitud_asunto, c.longitud_cuerpo, c.num_enlaces, c.enlaces_acortados,
                c.enlaces_con_ip, c.dominio_imita_marca, c.usa_punycode, c.palabras_urgencia,
                c.solicita_credenciales, c.nombre_coincide_dominio, c.tiene_adjunto,
                c.antiguedad_dominio_dias, c.hora_envio, c.porcentaje_mayusculas, c.veredicto) = 0
  and 'NULL' not in (c.id_correo, c.fecha_analisis, c.proveedor, c.dominio_remitente,
                     c.tipo_dominio, c.dominio_imita_marca, c.usa_punycode,
                     c.solicita_credenciales, c.nombre_coincide_dominio, c.tiene_adjunto,
                     c.veredicto)
  and longitud_asunto <= 150 and longitud_cuerpo <= 5000 and num_enlaces <= 25
  and enlaces_acortados <= 25 and enlaces_con_ip <= 25 and palabras_urgencia <= 12
  and antiguedad_dominio_dias between 1 and 9000 and porcentaje_mayusculas <= 100;

revoke all on public.mineria_correos_limpios from public, anon;
grant select on public.mineria_correos_limpios to authenticated;

drop function if exists public.mineria_graficos();
drop materialized view if exists public.mineria_graficos_cache;

create materialized view public.mineria_graficos_cache as
with
-- Variables numéricas y ancho de clase (bin) de cada histograma.
variables(variable, ancho) as (
  values ('longitud_cuerpo', 50.0), ('longitud_asunto', 5.0), ('num_enlaces', 1.0),
         ('enlaces_acortados', 1.0), ('palabras_urgencia', 1.0),
         ('porcentaje_mayusculas', 2.0), ('antiguedad_dominio_dias', 250.0),
         ('hora_envio', 1.0)
),
limpios as materialized (select * from public.mineria_correos_limpios),
limpios_largo as materialized (
  select l.veredicto, x.variable, x.valor
  from limpios l
  cross join lateral (values
    ('longitud_cuerpo', l.longitud_cuerpo::float8), ('longitud_asunto', l.longitud_asunto),
    ('num_enlaces', l.num_enlaces), ('enlaces_acortados', l.enlaces_acortados),
    ('palabras_urgencia', l.palabras_urgencia),
    ('porcentaje_mayusculas', l.porcentaje_mayusculas),
    ('antiguedad_dominio_dias', l.antiguedad_dominio_dias), ('hora_envio', l.hora_envio)
  ) x(variable, valor)
),
crudos_largo as (
  select x.variable, x.valor
  from public.mineria_correos c
  cross join lateral (values
    ('longitud_cuerpo', c.longitud_cuerpo::float8), ('longitud_asunto', c.longitud_asunto),
    ('num_enlaces', c.num_enlaces), ('enlaces_acortados', c.enlaces_acortados),
    ('palabras_urgencia', c.palabras_urgencia),
    ('porcentaje_mayusculas', c.porcentaje_mayusculas),
    ('antiguedad_dominio_dias', c.antiguedad_dominio_dias), ('hora_envio', c.hora_envio)
  ) x(variable, valor)
  where x.valor is not null
)
select jsonb_build_object(
  -- Histograma por variable y clase en el dataset limpio (como "Filtrar outliers").
  'histogramas', (
    select coalesce(jsonb_agg(to_jsonb(t) order by variable, desde), '[]'::jsonb)
    from (
      select l.variable, floor(l.valor / v.ancho) * v.ancho as desde,
             count(*) filter (where l.veredicto = 'seguro') as seguro,
             count(*) filter (where l.veredicto = 'sospechoso') as sospechoso,
             count(*) filter (where l.veredicto = 'peligroso') as peligroso
      from limpios_largo l join variables v using (variable)
      group by 1, 2
    ) t
  ),
  -- Muestra sistemática de los crudos (1 de cada 50 filas) como "Read Database".
  -- Formato compacto: [fila, proveedor, cuerpo, asunto, enlaces, urgencia, antigüedad, mayúsculas].
  'muestra', (
    select coalesce(jsonb_agg(jsonb_build_array(
             fila, coalesce(proveedor, 'vacío'),
             longitud_cuerpo, longitud_asunto, num_enlaces, palabras_urgencia,
             antiguedad_dominio_dias, porcentaje_mayusculas) order by fila), '[]'::jsonb)
    from public.mineria_correos where fila % 50 = 0
  ),
  -- Estadísticas descriptivas antes y después de la depuración.
  'estadisticas', (
    select coalesce(jsonb_agg(to_jsonb(t) order by variable, fase), '[]'::jsonb)
    from (
      select variable, fase, count(*) as n,
             min(valor) as minimo, max(valor) as maximo,
             round(avg(valor)::numeric, 2) as media,
             round((percentile_cont(0.5) within group (order by valor))::numeric, 2) as mediana,
             round(stddev_samp(valor)::numeric, 2) as desviacion
      from (
        select variable, 'crudos' as fase, valor from crudos_largo
        union all
        select variable, 'limpios', valor from limpios_largo
      ) s
      group by variable, fase
    ) t
  ),
  -- Proveedor × veredicto en el dataset limpio.
  'proveedores', (
    select coalesce(jsonb_agg(to_jsonb(t) order by proveedor), '[]'::jsonb)
    from (
      select proveedor,
             count(*) filter (where veredicto = 'seguro') as seguro,
             count(*) filter (where veredicto = 'sospechoso') as sospechoso,
             count(*) filter (where veredicto = 'peligroso') as peligroso
      from limpios group by proveedor
    ) t
  )
) as datos;

revoke all on public.mineria_graficos_cache from public, anon, authenticated;

-- Lectura para el panel: caché + confianza del modelo en vivo (20 % de prueba).
create or replace function public.mineria_graficos()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select (select datos from mineria_graficos_cache)
    || jsonb_build_object('confianza', (
      select coalesce(jsonb_agg(to_jsonb(t) order by desde), '[]'::jsonb)
      from (
        select least(floor(conf * 20) / 20, 0.95) as desde,
               count(*) filter (where acierto) as aciertos,
               count(*) filter (where not acierto) as errores
        from (
          select veredicto = prediction_veredicto as acierto,
                 greatest(confidence_seguro, confidence_sospechoso, confidence_peligroso) as conf
          from mineria_predicciones
        ) p
        where conf is not null group by 1
      ) t
    ));
$$;

revoke all on function public.mineria_graficos() from public, anon;
grant execute on function public.mineria_graficos() to authenticated;

-- El script de carga (rol "mineria") refresca la caché tras reemplazar los datos crudos.
create or replace function public.mineria_refrescar_graficos()
returns void
language sql
security definer
set search_path = public
as $$ refresh materialized view public.mineria_graficos_cache; $$;

revoke all on function public.mineria_refrescar_graficos() from public, anon, authenticated;
grant execute on function public.mineria_refrescar_graficos() to mineria;
