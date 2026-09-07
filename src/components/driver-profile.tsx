import Image from "next/image";
import { Icon } from "./icon";
import { ShareProfile } from "./share-profile";

const services = [
  { number: "01", icon: "plane", title: "Aeropuerto, sin prisas.", text: "Traslados de llegada y salida de Tocumen, coordinados con tu itinerario.", detail: "Aeropuerto ↔ Ciudad" },
  { number: "02", icon: "briefcase", title: "Tu agenda, a tiempo.", text: "Un conductor para tus reuniones, compromisos y recorridos de trabajo.", detail: "Traslados ejecutivos" },
  { number: "03", icon: "compass", title: "Panamá, a tu ritmo.", text: "Recorridos privados para descubrir la ciudad con el tiempo que merece.", detail: "Experiencias privadas" },
];

export function DriverProfile() {
  return <>
    <a className="skip-link" href="#perfil">Saltar al perfil</a>
    <div className="demo-bar"><span className="demo-dot" />Perfil ficticio de muestra <span className="demo-separator">/</span> Driver Connect</div>
    <div className="site-shell">
      <header className="site-header">
        <a href="#perfil" className="brand" aria-label="Driver Connect, inicio"><span className="brand-symbol">dc<span>.</span></span><span className="brand-word">DRIVER<br /><strong>CONNECT</strong></span></a>
        <nav aria-label="Navegación del perfil"><a href="#servicios">Servicios</a><a href="#vehiculo">Vehículo</a><a className="nav-contact" href="#contacto">Contacto <Icon name="arrow" /></a></nav>
      </header>
      <main>
        <section className="profile-hero" id="perfil" aria-labelledby="driver-name">
          <div className="profile-copy">
            <div className="profile-intro"><span className="avatar" aria-label="Iniciales de Daniel Ríos">DR</span><div><span className="eyebrow">TU CONDUCTOR PRIVADO</span><span className="location"><Icon name="pin" />Ciudad de Panamá</span></div></div>
            <h1 id="driver-name">Daniel <em>Ríos.</em></h1>
            <p className="profile-subtitle">El gusto de viajar<br />bien acompañado.</p>
            <p className="profile-description">Del primer encuentro a tu destino, me ocupo de que cada traslado sea cómodo, puntual y a tu medida.</p>
            <div className="profile-details"><span><Icon name="clock" />7 años al volante</span><span><Icon name="globe" />Español · English</span></div>
            <div className="hero-actions"><a className="button button-primary" href="/conductor/demo/contacto" download="daniel-rios-muestra.vcf"><Icon name="download" />Guardar contacto</a><ShareProfile /></div>
            <p className="contact-note">Contacto de demostración, sin teléfono ni correo reales.</p>
          </div>
          <div className="hero-photo">
            <Image src="/images/demo-suv.png" alt="Imagen ilustrativa de un SUV junto a una costa tropical al atardecer" fill sizes="(max-width: 760px) 100vw, 50vw" preload />
            <span className="photo-label">IMAGEN ILUSTRATIVA</span>
            <div className="photo-caption"><span className="eyebrow">ESPACIO PARA VIAJAR MEJOR</span><strong>Tu viaje.<br /><em>Con otra perspectiva.</em></strong><span className="photo-coordinate">PANAMÁ <span>08°58′ N · 79°31′ W</span></span></div>
          </div>
        </section>
        <div className="promise-strip" aria-label="Enfoque del servicio de muestra"><span><Icon name="check" />Atención personalizada</span><span><Icon name="check" />Traslados coordinados</span><span><Icon name="check" />Comodidad en el camino</span><span className="strip-tag">EL DETALLE HACE EL VIAJE</span></div>
        <section className="services-section" id="servicios" aria-labelledby="services-title">
          <div className="section-heading"><div><span className="eyebrow">01 / SERVICIOS</span><h2 id="services-title">Para cada <em>destino.</em></h2></div><p>Una forma más personal<br />de moverte por Panamá.</p></div>
          <div className="services-grid">{services.map((service) => <article className="service-card" key={service.number}><div className="service-top"><span className="service-icon"><Icon name={service.icon} /></span><span>{service.number}</span></div><h3>{service.title}</h3><p>{service.text}</p><div className="service-detail">{service.detail}<Icon name="arrow" /></div></article>)}</div>
          <div className="destinations"><span>RUTAS QUE INSPIRAN</span><p>Casco Antiguo <i />Canal de Panamá <i />Amador <i />Cinta Costera</p></div>
        </section>
        <section className="vehicle-section" id="vehiculo" aria-labelledby="vehicle-title"><div><span className="eyebrow">02 / A BORDO</span><h2 id="vehicle-title">El espacio también<br /><em>hace la diferencia.</em></h2><p>Un SUV ejecutivo para disfrutar el trayecto con comodidad, espacio y atención a los detalles.</p></div><div className="vehicle-specs"><h3>SUV ejecutivo</h3><span className="vehicle-type">Categoría de vehículo de muestra</span><div className="specs-grid"><span><Icon name="user" /><strong>3 pasajeros</strong>Capacidad de servicio</span><span><Icon name="bag" /><strong>3 maletas</strong>Equipaje estándar</span></div><div className="vehicle-features"><span>Aire acondicionado</span><span>Interior amplio</span><span>Viaje privado</span></div></div></section>
        <section className="contact-section" id="contacto" aria-labelledby="contact-title"><div><span className="eyebrow">03 / SIGAMOS EN CONTACTO</span><h2 id="contact-title">Tu próximo viaje,<br /><em>a una conversación.</em></h2><p>Este perfil es ficticio y no admite solicitudes.<br />Los canales de contacto se muestran como referencia.</p></div><div className="contact-options"><button disabled className="contact-option"><span className="contact-icon"><Icon name="message" /></span><span><strong>WhatsApp</strong><small>No disponible en la muestra</small></span><Icon name="arrow" /></button><button disabled className="contact-option"><span className="contact-icon"><Icon name="mail" /></span><span><strong>Correo electrónico</strong><small>No disponible en la muestra</small></span><Icon name="arrow" /></button><a href="/conductor/demo/contacto" download="daniel-rios-muestra.vcf" className="contact-download">Guardar el contacto de muestra<Icon name="download" /></a></div></section>
      </main>
      <footer className="site-footer"><a href="#perfil" className="footer-brand">Driver Connect<span>.</span></a><span>Una conexión. Más posibilidades.</span><span className="footer-demo">Perfil de demostración · 2026</span></footer>
    </div>
  </>;
}
