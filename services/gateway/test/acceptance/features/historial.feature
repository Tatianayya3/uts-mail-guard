# language: es
Característica: Historial de análisis (UC-07, UC-10 y UC-13)
  Como usuaria registrada
  Quiero que mis análisis se guarden y poder borrarlos
  Para revisar qué correos eran peligrosos y controlar mis datos

  Escenario: El análisis se guarda en el historial
    Dado que Ana inició sesión
    Cuando analiza el correo "phishing del banco"
    Entonces su historial tiene 1 análisis
    Y el último análisis es "peligroso"

  Escenario: Analizar dos veces el mismo correo no lo duplica
    Dado que Ana inició sesión
    Cuando analiza el correo "phishing del banco"
    Y analiza el correo "phishing del banco"
    Entonces su historial tiene 1 análisis

  Escenario: Ver el detalle de un análisis
    Dado que Ana inició sesión
    Y que analizó el correo "alerta legítima de Google"
    Cuando abre el detalle del último análisis
    Entonces ve el remitente "no-reply@accounts.google.com"

  Escenario: Borrar todo el historial
    Dado que Ana inició sesión
    Y que analizó el correo "phishing del banco"
    Y que analizó el correo "alerta legítima de Google"
    Cuando borra su historial
    Entonces se borraron 2 análisis
    Y su historial tiene 0 análisis

  Escenario: Sin sesión no se puede ver un historial
    Dado un invitado con la extensión instalada
    Cuando intenta ver el historial
    Entonces recibe el error 401
