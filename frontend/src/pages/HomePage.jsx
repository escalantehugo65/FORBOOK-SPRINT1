import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { usePageTitle } from "../hooks/usePageTitle";
import { catalogService } from "../services/catalog";
import { questionService } from "../services/questions";
import { firstName } from "../utils/content";
import { pointsLabel } from "../utils/shop";
import InstitutionResources from "../components/InstitutionResources";
import ContentCard from "../components/ContentCard";
import QuestionCard from "../components/QuestionCard";
import Avatar from "../components/Avatar";
import LevelBadge from "../components/LevelBadge";
import { EmptyState, ErrorMessage, Loading } from "../components/Feedback";
import { ArrowIcon, PointsIcon } from "../components/Icons";
import NextStep from "../components/NextStep";
import InstitutionRoute from "../components/InstitutionRoute";

// FF-15: una pregunta de la comunidad para el inicio. Primero una de tu institución (mejor si ya tiene
// respuestas); si no hay, una general. Si no hay ninguna, se invita a preguntar.
function RelevantQuestion() {
  const loader = useCallback((signal) => questionService.relevant(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const question = result?.data;
  const reason = result?.meta.reason;
  return (
    <section className="home-section" aria-labelledby="relevant-title">
      <div className="section-row">
        <div>
          <p className="eyebrow">De la comunidad</p>
          <h2 id="relevant-title">Una pregunta para vos</h2>
        </div>
        <Link className="text-link" to="/preguntas">
          Ver todas <ArrowIcon />
        </Link>
      </div>
      {loading ? (
        <Loading text="Buscando una pregunta para vos…" />
      ) : error ? (
        <ErrorMessage message={error.message} retry={retry} />
      ) : question ? (
        <div className="relevant-question">
          <p className="relevant-reason">
            {reason === "institution"
              ? "Es de estudiantes de tu institución."
              : "Todavía no hay preguntas de otros estudiantes de tu institución: esta es una pregunta general."}{" "}
            {question.answersCount > 0
              ? `Ya tiene ${question.answersCount} ${question.answersCount === 1 ? "respuesta" : "respuestas"}.`
              : "Todavía nadie respondió: ¿sabés algo?"}
          </p>
          <QuestionCard question={question} />
        </div>
      ) : (
        <EmptyState
          title="Todavía no hay preguntas para mostrarte"
          headingLevel={3}
          action={
            <Link className="btn btn-primary" to="/preguntas/nueva">
              Hacer una pregunta
            </Link>
          }
        >
          Si tenés una duda sobre Formosa, publicala: otros estudiantes te pueden ayudar.
        </EmptyState>
      )}
    </section>
  );
}

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
              <Avatar person={user} size="large" />
              <div>
                <h2 id="profile-title">Tu perfil de llegada</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="home-points">
              <LevelBadge level={user.level} />
              <Link className="points-link" to="/tienda">
                <PointsIcon />
                {pointsLabel(user.points ?? 0)}
                <span className="sr-only">. Ir a la tienda</span>
              </Link>
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
        <RelevantQuestion />
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
