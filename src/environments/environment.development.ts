export const token =
  'APP_PORTAL_RENTA_Wm1SaFptbGhhR1pyYUd4aGJHUm0=_YmYyZjMzNjAtMzcwMC00ZDJlLTgyNTktOTI5MzhlN2FhOGM1';

export const environment = {
  production: false,
  baseUrl: 'https://portalrenta.duckdns.org/api/v1',
  baserUrlTest: 'https://rentaraizbackend.duckdns.org/api/v1',
  /** Chat del asistente con respuestas de prueba, sin llamar al backend. */
  asistenteMock: false,
  /** Opción "Con IA" en la barra de búsqueda (POST /busqueda/interpretar). */
  busquedaIa: true,
  /** Búsqueda con IA interpretada en el navegador con reglas simples, sin llamar al backend. */
  busquedaIaMock: false,
  /** Formulario propio de disponibilidad para el recorrido (POST /recorridos) en lugar del widget de LeadConnector. */
  recorridoPropio: true,
  /** Simula la respuesta de POST /recorridos, sin llamar al backend (mientras no exista el endpoint). */
  recorridoMock: true,
  /** Formulario propio "Consigna tu propiedad" (POST /captaciones) en lugar del iframe de LeadConnector. */
  captacionPropia: true,
  /** Simula la respuesta de POST /captaciones, sin llamar al backend (mientras no exista el endpoint). */
  captacionMock: true,
};

export const conexionVault = {
  production: true,
  vaultToken: '',
  vaultUrl: '',
};

export const Login = {
  tokenEncrypt: 'T0FIUlRBQkNTV0E=',
  ivEncrypted: 'VUJTUldLRE1BWQ==',
  token: token,
};
