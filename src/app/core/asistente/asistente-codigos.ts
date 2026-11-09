/**
 * Códigos de inmueble escritos en un mensaje del chat. Son las mismas reglas que debe aplicar el backend
 * (docs/contrato-asistente.md); el front las usa en la simulación y para saber si una respuesta con tarjetas
 * contesta a un código o muestra inmuebles parecidos.
 */

const MAXIMO_CODIGOS_POR_MENSAJE = 5;
/** Un número seguido de estas palabras es una cantidad o un precio, no un código. */
const NO_ES_CODIGO = /^\s*(?:habitaci|alcoba|ba[ñn]o|parqueader|garaje|m2|m²|mts|metro|estrato|piso|mill[oó]n|millones|mil\b|pesos)/i;

/**
 * "inmueble 6945", "código 6945", "#6945", o un número de 3 a 5 cifras al inicio ("6945 es para arrendar?").
 * No cuentan precios, teléfonos ni cantidades ("3 habitaciones"). Como máximo 5, sin repetir.
 */
export function codigosEnMensaje(mensaje: string): number[] {
  const codigos: number[] = [];
  const agregar = (texto: string, despues: string) => {
    const codigo = Number(texto);
    if (NO_ES_CODIGO.test(despues) || codigos.includes(codigo)) return;
    if (codigos.length < MAXIMO_CODIGOS_POR_MENSAJE) codigos.push(codigo);
  };
  const conPalabra =
    /(?:c[oó]d(?:igo)?|inmueble|propiedad|ref(?:erencia)?)\.?\s*(?:n[oº°.]*\s*)?:?\s*#?\s*(\d{3,5})(?![\d.,]?\d)|#\s*(\d{3,5})(?![\d.,]?\d)/gi;
  for (const coincidencia of mensaje.matchAll(conPalabra)) {
    const fin = (coincidencia.index ?? 0) + coincidencia[0].length;
    agregar(coincidencia[1] ?? coincidencia[2], mensaje.slice(fin));
  }
  const alInicio = /^\s*(\d{3,5})(?![\d.,]?\d)/.exec(mensaje);
  if (alInicio) agregar(alInicio[1], mensaje.slice(alInicio[0].length));
  return codigos;
}
