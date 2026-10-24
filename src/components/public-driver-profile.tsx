"use client";
import Image from "next/image";
import Link from "next/link";
import type { PublicDriver } from "@/lib/public-driver";
import { PublicLanguageSelect, usePublicLanguage } from "./public-language";
import { publicHeadline } from "@/lib/profile-headline";
import { Icon } from "./icon";
import { AutoFitPhoto } from "./auto-fit-photo";
import { PhotoCarousel } from "./gallery/photo-carousel";
import { ShareProfile } from "./share-profile";

export function PublicDriverProfile({ driver, demo = false }: { driver: PublicDriver; demo?: boolean }) {
  const { language, t } = usePublicLanguage();
  const services = driver.services.map(service => ({ ...service,
    name: language !== "es" && service.nameEn ? service.nameEn : service.name,
    description: language !== "es" && service.descriptionEn ? service.descriptionEn : service.description,
  }));
  const vehicle = driver.vehicles[0];
  const uploadedVehicle = driver.photos.find(photo => photo.category === "VEHICLE");
  const cover = vehicle?.photoUrl?.startsWith("/media/vehiculos/") ? vehicle.photoUrl : uploadedVehicle ? `/media/${uploadedVehicle.id}` : vehicle?.photoUrl;
  const initials = driver.name.split(/\s+/).slice(0, 2).map(name => name[0]).join("");
  const contact = `/conductor/${driver.slug}/contacto`, reserve = `/conductor/${driver.slug}/reservar`;
  const whatsapp = driver.whatsapp ? `https://wa.me/${driver.whatsapp.replace(/\D/g, "")}` : null;
  const hasAction = demo || driver.bookingEnabled || Boolean(whatsapp);
  const headline = publicHeadline(driver, language);
  const hasCustomHeadline = Boolean((language !== "es" && driver.headlineEn?.trim()) || driver.headline?.trim());
  const description = language !== "es" && driver.descriptionEn || driver.description;
  const portrait = (size: number) => driver.photoUrl
    ? <Image className="reference-portrait" src={driver.photoUrl} alt={driver.name} width={size} height={size} unoptimized referrerPolicy="no-referrer" />
    : <span className="reference-initials" aria-hidden="true">{initials}</span>;
  return <div className={`driver-public reference-profile ${hasAction ? "with-mobile-actions" : ""}`}>
    <a className="skip-link" href="#perfil">{t("Saltar al perfil", "Skip to profile")}</a>
    {demo && <div className="demo-bar">{t("Perfil ficticio de muestra · Datos y vehículo ilustrativos", "Fictional demo profile · Illustrative details and vehicle")}</div>}
    <main>
      <section className={`reference-hero ${cover ? "has-photo" : ""}`} id="perfil" aria-labelledby="driver-name">
        {cover && <AutoFitPhoto className="reference-hero-media" src={cover} alt={demo ? t("SUV ilustrativo en Panamá", "Illustrative SUV in Panama") : `${vehicle?.brand || ""} ${vehicle?.model || driver.name}`} sizes="(max-width: 760px) 100vw, 80vw" priority />}
        <div className="reference-hero-shade" aria-hidden="true" />
        <div className="reference-hero-inner">
          <header className="reference-header">
            <a href="#perfil" className="brand"><span className="brand-symbol">dc<span>.</span></span><span className="brand-word">DRIVER<br /><strong>CONNECT</strong></span></a>
            <nav aria-label={t("Perfil del conductor", "Driver profile")}>
              {services.length > 0 && <a href="#servicios">{t("Servicios", "Services")}</a>}
              {vehicle && <a href="#vehiculo">{t("Vehículos", "Vehicles")}</a>}
              {driver.photos.length > 0 && <a href="#galeria">{t("Galería", "Gallery")}</a>}
              <PublicLanguageSelect language={language} />
            </nav>
          </header>
          <div className="reference-hero-copy">
            <span className="eyebrow">{t("TRASLADOS PRIVADOS · A TU MEDIDA", "PRIVATE TRANSFERS · YOUR WAY")}</span>
            <h1 id="driver-name" className={hasCustomHeadline ? "is-custom-headline" : undefined}>{hasCustomHeadline ? headline : <>{t("Tu destino,", "Your destination,")}<br />{t("en buenas", "in good")} <em>{t("manos.", "hands.")}</em></>}</h1>
            <p className="reference-hero-intro">{t("Traslados privados, recorridos y servicios personalizados. Coordina tu próximo viaje directamente con tu conductor.", "Private transfers, tours and personalized services. Arrange your next journey directly with your driver.")}</p>
            <div className="reference-driver">{portrait(80)}<div><h2>{driver.name}{driver.verified && <span className="reference-verified" title={t("Verificado por administración", "Verified by administration")}><Icon name="shield" /></span>}</h2><p>{t("Tu conductor privado", "Your private driver")}</p>{driver.location && <p>{driver.location}</p>}</div></div>
            <ul className="reference-benefits">
              <li><Icon name="user" /><span>{t("Atención", "Personal")}<br />{t("personal", "service")}</span></li>
              <li><Icon name="clock" /><span>{t("Coordina", "Plan")}<br />{t("tu horario", "your time")}</span></li>
              <li><Icon name="compass" /><span>{t("Viajes", "Private")}<br />{t("a tu medida", "journeys")}</span></li>
              <li><Icon name="globe" /><span>{driver.experience} {t("años de", "years of")}<br />{t("experiencia", "experience")}</span></li>
            </ul>
            <div className="reference-actions">
              {driver.bookingEnabled && <Link className="button button-primary" href={reserve}><Icon name="calendar" />{t("Reservar traslado", "Request a ride")}<Icon name="arrow" /></Link>}
              {whatsapp && <a className="button reference-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="message" />{t("Contactar por WhatsApp", "Contact on WhatsApp")}<Icon name="arrow" /></a>}
              {demo && <Link className="button button-primary" href="/demo/agenda"><Icon name="calendar" />{t("Explorar la agenda de muestra", "Explore the demo calendar")}<Icon name="arrow" /></Link>}
              {!driver.bookingEnabled && !whatsapp && !demo && <a className="button button-primary" href={contact} download><Icon name="download" />{t("Guardar contacto", "Save contact")}</a>}
            </div>
            {driver.bookingEnabled && <p className="reference-action-note">{t("Disponibilidad y precio sujetos a confirmación.", "Availability and price are subject to confirmation.")}</p>}
            {demo && <p className="reference-action-note">{t("Muestra: reservas y contactos reales deshabilitados.", "Demo: real bookings and contact channels are disabled.")}</p>}
            <div className="reference-share"><a href={contact} download><Icon name="download" />{t("Guardar contacto", "Save contact")}</a><ShareProfile path={`/conductor/${driver.slug}`} language={language} title={`${driver.name} · Driver Connect`} /></div>
          </div>
          {driver.location && <div className="reference-location"><Icon name="pin" /><span>{driver.location}<small>{t("Tu próximo destino te espera", "Your next destination awaits")}</small></span></div>}
        </div>
      </section>
      <div className="reference-content">
        {services.length > 0 && <section className="reference-services" id="servicios" aria-labelledby="services-title">
          <div className="reference-section-heading"><div><span className="eyebrow">{t("NUESTROS SERVICIOS", "OUR SERVICES")}</span><h2 id="services-title">{t("¿A dónde quieres ir?", "Where would you like to go?")}</h2></div><a href="#contacto" className="text-link">{t("Consultar", "Get in touch")}<Icon name="arrow" /></a></div>
          <div className="reference-services-grid">{services.map((service, index) => <article className="reference-service" key={`${index}-${service.name}`}>
            {service.photoUrl ? <AutoFitPhoto className="reference-service-image" src={service.photoUrl} alt={service.name} sizes="(max-width: 600px) 50vw, 40vw" /> : <div className="reference-service-placeholder" aria-hidden="true"><Icon name={service.icon || "compass"} /><span>{String(index + 1).padStart(2, "0")}</span></div>}
            <div className="reference-service-body"><span className="reference-service-icon"><Icon name={service.icon || "compass"} /></span><div><h3>{service.name}</h3>{service.description && <p>{service.description}</p>}</div><a className="reference-service-link" href="#contacto" aria-label={`${t("Consultar", "Ask about")} ${service.name}`}><Icon name="arrow" /></a></div>
          </article>)}</div>
        </section>}
        {vehicle && <section className="reference-vehicles" id="vehiculo" aria-label={t("Vehículos del conductor", "Driver vehicles")}>
          <article className={`reference-featured-vehicle ${cover ? "has-photo" : ""}`}>
            {cover && <AutoFitPhoto className="reference-featured-image" src={cover} alt={`${vehicle.brand} ${vehicle.model}`} sizes="(max-width:760px) 95vw, 65vw" />}
            <div className="reference-featured-shade" aria-hidden="true" />
            <div className="reference-featured-copy"><span className="eyebrow">{t("VEHÍCULO DESTACADO", "FEATURED VEHICLE")}</span><h2>{vehicle.brand} {vehicle.model} <span className="reference-year">{vehicle.year}</span></h2>{(language !== "es" && vehicle.descriptionEn || vehicle.description) && <p>{language !== "es" && vehicle.descriptionEn || vehicle.description}</p>}<dl><div><Icon name="user" /><dt>{t("Capacidad", "Capacity")}</dt><dd>{vehicle.passengers} {t("pasajeros", "passengers")}</dd></div>{vehicle.color && <div><Icon name="car" /><dt>{t("Color", "Color")}</dt><dd>{language !== "es" && vehicle.colorEn || vehicle.color}</dd></div>}</dl>{driver.vehicles.length > 1 && <a className="button button-primary" href="#mas-vehiculos">{t("Ver más vehículos", "More vehicles")}<Icon name="arrow" /></a>}</div>
          </article>
          {driver.vehicles.length > 1 && <div className="reference-more-vehicles" id="mas-vehiculos">{driver.vehicles.slice(1).map((car,index) => <article key={`${index}-${car.brand}-${car.model}`}>
            {car.photoUrl ? <AutoFitPhoto className="reference-other-image" src={car.photoUrl} alt={`${car.brand} ${car.model}`} sizes="(max-width:600px) 90vw, 40vw" /> : <div className="reference-car-placeholder"><Icon name="car" /></div>}
            <div><h3>{car.brand} {car.model}</h3><p>{car.year} · {car.passengers} {t("pasajeros", "passengers")}{car.color ? ` · ${language !== "es" && car.colorEn || car.color}` : ""}</p>{(language !== "es" && car.descriptionEn || car.description) && <p>{language !== "es" && car.descriptionEn || car.description}</p>}</div>
          </article>)}</div>}
        </section>}
        <PhotoCarousel photos={driver.photos} language={language} />
        <section className="reference-about" aria-labelledby="about-driver">{portrait(160)}<div><span className="eyebrow">{t("SOBRE MÍ", "ABOUT ME")}</span><h2 id="about-driver">{driver.name}</h2>{description && <p>{description}</p>}</div><ul>{driver.location && <li><Icon name="pin" />{driver.location}</li>}{driver.languages.length > 0 && <li><Icon name="message" />{driver.languages.join(" · ")}</li>}<li><Icon name="compass" />{driver.experience} {t("años de experiencia", "years of experience")}</li></ul></section>
        <section className="reference-contact" id="contacto" aria-label={t("Contacta con tu conductor", "Contact your driver")}>
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="message" /><span>WhatsApp<small>{driver.whatsapp}</small></span><Icon name="arrow" /></a>}
          {driver.phone && <a href={`tel:${driver.phone}`}><Icon name="user" /><span>{t("Llamar", "Call")}<small>{driver.phone}</small></span><Icon name="arrow" /></a>}
          {driver.email && <a href={`mailto:${driver.email}`}><Icon name="mail" /><span>{t("Correo", "Email")}<small>{driver.email}</small></span><Icon name="arrow" /></a>}
          <a href={contact} download><Icon name="download" /><span>{t("Guardar contacto", "Save contact")}<small>{demo ? t("Tarjeta de muestra sin teléfono ni correo", "Demo card without phone or email") : t("Siempre a mano", "Always handy")}</small></span><Icon name="arrow" /></a>
        </section>
        <footer className="reference-footer"><a href="#perfil">Driver Connect<span>.</span></a><Link href="/privacidad-calendario">{t("Privacidad del calendario", "Calendar privacy")}</Link><Link href="/login-conductor">{t("Acceso conductor", "Driver sign in")}</Link></footer>
      </div>
    </main>
    {hasAction && <nav className="reference-bottom-actions" aria-label={t("Contacto rápido", "Quick contact")}>
      {driver.bookingEnabled && <Link className="button button-primary" href={reserve}><Icon name="calendar" />{t("Reservar traslado", "Request a ride")}<Icon name="arrow" /></Link>}
      {whatsapp && <a className="button reference-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="message" />WhatsApp<Icon name="arrow" /></a>}
      {demo && <Link className="button button-primary" href="/demo/agenda"><Icon name="calendar" />{t("Explorar agenda de muestra", "Explore demo calendar")}<Icon name="arrow" /></Link>}
    </nav>}
  </div>;
}
