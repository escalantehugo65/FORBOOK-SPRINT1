// Error con código HTTP. El controlador lo lanza y error.middleware.js arma la respuesta:
// { error: { message, fields } } (fields es opcional y sirve para marcar campos del formulario).
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
