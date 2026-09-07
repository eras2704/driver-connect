"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="admin-empty" role="alert"><h2>No pudimos cargar esta sección.</h2><p>Comprueba la conexión e inténtalo de nuevo.</p><button className="button button-primary" onClick={reset}>Volver a intentar</button></section>;
}
