// Error con código HTTP. El controlador lo lanza y error.middleware.js arma la respuesta:
// { error: { message, fields } } (fields es opcional y sirve para marcar campos del formulario).
// code es opcional: una clave fija para que el frontend reconozca el caso (por ejemplo, 'account_suspended').
export class HttpError extends Error {
  constructor(status, message, fields, code) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}
