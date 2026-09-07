export default function Home() {
  return (
    <main>
      <header><span className="brand-mark" aria-hidden="true">DC</span><span>Driver Connect</span></header>
      <section aria-labelledby="title">
        <p className="status"><span aria-hidden="true" />En preparación</p>
        <h1 id="title">Tu próximo contacto<br />empieza aquí.</h1>
        <p className="intro">Estamos preparando un espacio para conocer a tu conductor, consultar sus servicios y mantener el contacto.</p>
        <div className="note">Los perfiles y los accesos privados estarán disponibles en una próxima etapa.</div>
      </section>
      <footer>Driver Connect <span>Perfiles de conductores · Tarjetas NFC</span></footer>
    </main>
  );
}
