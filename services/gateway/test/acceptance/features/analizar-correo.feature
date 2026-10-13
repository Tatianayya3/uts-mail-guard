# language: es
Característica: Analizar un correo abierto (UC-01 y UC-11)
  Como persona que usa Gmail u Outlook
  Quiero saber si un correo es phishing antes de abrir sus enlaces
  Para no caer en un fraude

  Escenario: Un correo de phishing se marca como peligroso
    Dado un invitado con la extensión instalada
    Cuando analiza el correo "phishing del banco"
    Entonces el veredicto es "peligroso"
    Y el puntaje de confianza es menor que 40
    Y el resultado no se guarda en ningún historial

  Escenario: Un correo legítimo se marca como seguro
    Dado un invitado con la extensión instalada
    Cuando analiza el correo "alerta legítima de Google"
    Entonces el veredicto es "seguro"
    Y el puntaje de confianza es mayor o igual que 70

  Escenario: El invitado agota su cuota diaria
    Dado un invitado que ya hizo 5 análisis hoy
    Cuando analiza el correo "alerta legítima de Google"
    Entonces recibe el error 429
    Y el mensaje invita a iniciar sesión
