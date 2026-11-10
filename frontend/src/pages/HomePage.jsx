import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { usePageTitle } from "../hooks/usePageTitle";
import { catalogService } from "../services/catalog";
import { firstName } from "../utils/content";
import InstitutionResources from "../components/InstitutionResources";
import ContentCard from "../components/ContentCard";
import { EmptyState, ErrorMessage, Loading } from "../components/Feedback";
import { ArrowIcon } from "../components/Icons";
import NextStep from "../components/NextStep";
import InstitutionRoute from "../components/InstitutionRoute";

// Inicio personalizado (FF-12): usa el perfil de la sesión y muestra pocos accesos, no el catálogo completo.
export default function HomePage() {
  const { user } = useAuth();
  usePageTitle("Mi inicio");
  const arrived = user.arrivalStatus === "arrived";
  const name = firstName(user.name);
  const loader = useCallback(
    (signal) => catalogService.contents({ page: 1 }, signal),
    [user.institutionId],
  );
  const featured = useFetch(loader);
  // Primero las fichas de su institución; si no hay, quedan las generales de la ciudad.
  const picks = [...(featured.result?.data || [])]
    .sort(
      (a, b) =>
        Number(b.institutionId != null) - Number(a.institutionId != null),
    )
    .slice(0, 3);

  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="container">
          <span className={arrived ? "pill" : "pill pill-yellow"}>
            {arrived ? "Ya estás en Formosa" : "Todavía no llegaste"}
          </span>
          <h1 id="home-title">Hola, {name}.</h1>
          <p className="lead">
            {arrived
              ? "Ya estás en la ciudad. Empezá por las referencias para moverte y resolver tus primeros trámites."
              : "Todavía estás preparando tu viaje. Conocé tu destino antes de llegar."}
          </p>
        </div>
      </section>
      <div className="container page">
        <div className="home-grid">
          <section className="profile-card" aria-labelledby="profile-title">
            <div className="profile-head">
              <span className="avatar avatar-large" aria-hidden="true">
                {name.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 id="profile-title">Tu perfil de llegada</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <dl className="profile-list">
              <div>
                <dt>Venís de</dt>
                <dd>{user.origin}</dd>
              </div>
              <div>
                <dt>Vas a estudiar en</dt>
                <dd>{user.institution?.name || "Institución no disponible"}</dd>
              </div>
              <div>
                <dt>Tu carrera</dt>
                <dd>{user.career}</dd>
              </div>
              <div>
                <dt>Tu llegada</dt>
                <dd>{arrived ? "Ya estoy en Formosa" : "Todavía no llegué"}</dd>
              </div>
            </dl>
          </section>
          <NextStep arrivalStatus={user.arrivalStatus} />
        </div>
        <InstitutionRoute />
        <InstitutionResources />
        <section className="home-section" aria-labelledby="start-title">
          <div className="section-row">
            <div>
              <p className="eyebrow">Para empezar</p>
              <h2 id="start-title">Fichas para tus primeros días</h2>
            </div>
            <Link className="text-link" to="/conozcamos">
              Ver todas <ArrowIcon />
            </Link>
          </div>
          {featured.loading ? (
            <Loading text="Buscando fichas para vos…" />
          ) : featured.error ? (
            <ErrorMessage
              message={featured.error.message}
              retry={featured.retry}
            />
          ) : picks.length ? (
            <div className="content-grid">
              {picks.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  headingLevel={3}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Todavía no hay fichas para tu perfil"
              headingLevel={3}
              action={
                <Link className="btn btn-primary" to="/conozcamos">
                  Ver las categorías
                </Link>
              }
            >
              Mientras tanto, podés recorrer las categorías de Conozcamos
              Formosa.
            </EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
