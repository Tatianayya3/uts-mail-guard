-- Mail Guard · resumen de la minería de datos para el panel web (idempotente).
-- Una sola llamada RPC devuelve los agregados: el panel nunca descarga las 100.000 filas.
-- Replica las reglas de limpieza del proceso de RapidMiner (mineria-datos/GUIA-RAPIDMINER.md).

-- Datos sintéticos (no personales): lectura para usuarios autenticados.
drop policy if exists "Authenticated can read mining dataset" on public.mineria_correos;
create policy "Authenticated can read mining dataset" on public.mineria_correos
  for select to authenticated using (true);

create or replace function public.mineria_resumen()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with crudos as (
    select id_correo, fecha_analisis, proveedor, dominio_remitente, tipo_dominio,
           longitud_asunto, longitud_cuerpo, num_enlaces, enlaces_acortados, enlaces_con_ip,
           dominio_imita_marca, usa_punycode, palabras_urgencia, solicita_credenciales,
           nombre_coincide_dominio, tiene_adjunto, antiguedad_dominio_dias, hora_envio,
           porcentaje_mayusculas, veredicto
    from mineria_correos
  ),
  sin_duplicados as (select distinct * from crudos),
  sin_faltantes as (
    select * from sin_duplicados c
    where num_nulls(c.id_correo, c.fecha_analisis, c.proveedor, c.dominio_remitente, c.tipo_dominio,
                    c.longitud_asunto, c.longitud_cuerpo, c.num_enlaces, c.enlaces_acortados,
                    c.enlaces_con_ip, c.dominio_imita_marca, c.usa_punycode, c.palabras_urgencia,
                    c.solicita_credenciales, c.nombre_coincide_dominio, c.tiene_adjunto,
                    c.antiguedad_dominio_dias, c.hora_envio, c.porcentaje_mayusculas, c.veredicto) = 0
      and 'NULL' not in (c.id_correo, c.fecha_analisis, c.proveedor, c.dominio_remitente,
                         c.tipo_dominio, c.dominio_imita_marca, c.usa_punycode,
                         c.solicita_credenciales, c.nombre_coincide_dominio, c.tiene_adjunto,
                         c.veredicto)
  ),
  limpios as (
    select * from sin_faltantes
    where longitud_asunto <= 150 and longitud_cuerpo <= 5000 and num_enlaces <= 25
      and enlaces_acortados <= 25 and enlaces_con_ip <= 25 and palabras_urgencia <= 12
      and antiguedad_dominio_dias between 1 and 9000 and porcentaje_mayusculas <= 100
  )
  select jsonb_build_object(
    'embudo', jsonb_build_object(
      'crudos', (select count(*) from crudos),
      'sin_duplicados', (select count(*) from sin_duplicados),
      'sin_faltantes', (select count(*) from sin_faltantes),
      'limpios', (select count(*) from limpios)
    ),
    -- Faltantes por columna en los datos crudos (NULL real o el texto 'NULL').
    'faltantes', (
      select jsonb_build_object(
        'proveedor', count(*) filter (where proveedor is null or proveedor = 'NULL'),
        'tipo_dominio', count(*) filter (where tipo_dominio is null or tipo_dominio = 'NULL'),
        'longitud_asunto', count(*) filter (where longitud_asunto is null),
        'longitud_cuerpo', count(*) filter (where longitud_cuerpo is null),
        'num_enlaces', count(*) filter (where num_enlaces is null),
        'enlaces_acortados', count(*) filter (where enlaces_acortados is null),
        'enlaces_con_ip', count(*) filter (where enlaces_con_ip is null),
        'dominio_imita_marca', count(*) filter (where dominio_imita_marca is null or dominio_imita_marca = 'NULL'),
        'usa_punycode', count(*) filter (where usa_punycode is null or usa_punycode = 'NULL'),
        'palabras_urgencia', count(*) filter (where palabras_urgencia is null),
        'solicita_credenciales', count(*) filter (where solicita_credenciales is null or solicita_credenciales = 'NULL'),
        'nombre_coincide_dominio', count(*) filter (where nombre_coincide_dominio is null or nombre_coincide_dominio = 'NULL'),
        'tiene_adjunto', count(*) filter (where tiene_adjunto is null or tiene_adjunto = 'NULL'),
        'antiguedad_dominio_dias', count(*) filter (where antiguedad_dominio_dias is null),
        'hora_envio', count(*) filter (where hora_envio is null),
        'porcentaje_mayusculas', count(*) filter (where porcentaje_mayusculas is null),
        'veredicto', count(*) filter (where veredicto is null or veredicto = 'NULL')
      ) from crudos
    ),
    -- Outliers por variable en los datos crudos (fuera del rango de negocio).
    'outliers', (
      select jsonb_build_object(
        'longitud_asunto', count(*) filter (where longitud_asunto > 150),
        'longitud_cuerpo', count(*) filter (where longitud_cuerpo > 5000),
        'num_enlaces', count(*) filter (where num_enlaces > 25),
        'enlaces_acortados', count(*) filter (where enlaces_acortados > 25),
        'enlaces_con_ip', count(*) filter (where enlaces_con_ip > 25),
        'palabras_urgencia', count(*) filter (where palabras_urgencia > 12),
        'antiguedad_dominio_dias', count(*) filter (where antiguedad_dominio_dias < 1 or antiguedad_dominio_dias > 9000),
        'porcentaje_mayusculas', count(*) filter (where porcentaje_mayusculas > 100)
      ) from crudos
    ),
    'clases', (select coalesce(jsonb_object_agg(veredicto, n), '{}'::jsonb)
               from (select veredicto, count(*) as n from limpios group by veredicto) t),
    -- Perfil promedio de cada clase en los datos limpios (qué distingue al phishing).
    'perfil', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select veredicto,
               round(avg(enlaces_acortados)::numeric, 2) as enlaces_acortados,
               round(avg(palabras_urgencia)::numeric, 2) as palabras_urgencia,
               round(avg(porcentaje_mayusculas)::numeric, 1) as porcentaje_mayusculas,
               round(avg(antiguedad_dominio_dias)::numeric, 0) as antiguedad_dominio_dias,
               round(100.0 * avg((solicita_credenciales = 'si')::int), 1) as solicita_credenciales,
               round(100.0 * avg((dominio_imita_marca = 'si')::int), 1) as dominio_imita_marca
        from limpios group by veredicto
      ) t
    ),
    'metricas', (select coalesce(jsonb_object_agg(criterio, valor), '{}'::jsonb) from mineria_metricas),
    'confusion', (
      select coalesce(jsonb_agg(jsonb_build_object('real', veredicto, 'predicho', prediction_veredicto, 'n', n)), '[]'::jsonb)
      from (select veredicto, prediction_veredicto, count(*) as n
            from mineria_predicciones group by veredicto, prediction_veredicto) t
    ),
    'prueba', (select count(*) from mineria_predicciones),
    'ejecutado_en', (select max(created_at) from mineria_predicciones)
  );
$$;

revoke all on function public.mineria_resumen() from public, anon;
grant execute on function public.mineria_resumen() to authenticated;
