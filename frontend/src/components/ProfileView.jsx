import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import LevelBadge from './LevelBadge';
import ProfileEffect from './ProfileEffect';
import { CameraIcon, PointsIcon } from './Icons';
import { formatDate } from '../utils/content';
import { pointsLabel } from '../utils/shop';
import { arrivalNames, ownArrivalNames, badgeNames, interestNames, warningReasons } from '../utils/profile';

const statusNames = { open: 'Abierta', answered: 'Respondida', closed: 'Cerrada' };

// Vista de un perfil: la usan /perfil (el propio) y /usuarios/:id (el de otra persona).
// Las decoraciones de la tienda (fondo, marco, efecto y color del nombre) reemplazan a las básicas.
// onChangePhoto: en el perfil propio, el botón de la cámara sobre la foto abre el selector de imágenes.
export default function ProfileView({ profile, actions, onChangePhoto }) {
  const decorations = profile.decorations || {};
  const banner = decorations.banner || profile.bannerStyle;
  const arrival = profile.arrivalStatus && (profile.own ? ownArrivalNames : arrivalNames)[profile.arrivalStatus];
  const details = [
    profile.institution && ['Estudia en', profile.institution.name],
    profile.career && ['Carrera', profile.career],
    profile.cohortYear && ['Ingreso', `Cohorte ${profile.cohortYear}`],
    profile.origin && ['Viene de', profile.origin],
    arrival && ['Llegada', arrival],
    ['En Forbook desde', formatDate(profile.memberSince)],
  ].filter(Boolean);
  return <article className="profile" aria-labelledby="profile-name">
    <header className="user-profile-head">
      <div className={`profile-banner banner-${banner}`} aria-hidden="true"/>
      <ProfileEffect effect={decorations.effect}/>
      <div className="profile-identity">
        <div className="profile-avatar">
          <Avatar person={profile} size="xl"/>
          {onChangePhoto && <button className="photo-button" type="button" onClick={onChangePhoto} aria-label={profile.avatarVersion ? 'Cambiar la foto de perfil' : 'Agregar una foto de perfil'}><CameraIcon/></button>}
        </div>
        <div className="profile-title">
          <DecoratedName as="h1" id="profile-name" name={profile.name} color={decorations.nameColor}/>
          <ul className="profile-badges" aria-label="Insignias">
            {profile.level && <li><LevelBadge level={profile.level} reputation={profile.reputation}/></li>}
            {profile.badges.map(badge => <li key={badge} className={`badge profile-badge-${badge}`}>{badgeNames[badge]}</li>)}
          </ul>
        </div>
        {(actions || profile.own) && <div className="profile-actions">
          {profile.own && profile.points !== undefined && <Link className="points-link" to="/tienda"><PointsIcon/>{pointsLabel(profile.points)}<span className="sr-only">. Ir a la tienda</span></Link>}
          {actions}
        </div>}
      </div>
    </header>

    {profile.warnings.length > 0 && <section className="profile-warnings" aria-labelledby="warnings-title">
      <h2 id="warnings-title">{profile.warnings.length === 1 ? '1 advertencia de moderación' : `${profile.warnings.length} advertencias de moderación`}</h2>
      <ul>{profile.warnings.map(warning => <li key={warning.id}>
        <strong>{warningReasons[warning.reason]}</strong> · {formatDate(warning.createdAt)}
        {warning.note && <p>{warning.note}</p>}
      </li>)}</ul>
      <p className="profile-warning-note">{profile.own
        ? 'Estas advertencias se ven en tu perfil. Si creés que hay un error, escribí al equipo de moderación.'
        : 'Advertencias que dio el equipo de moderación por publicaciones de esta cuenta.'}</p>
    </section>}

    <div className="profile-grid">
      <div className="profile-main">
        <section className="profile-card" aria-labelledby="about-title">
          <h2 id="about-title">Sobre {profile.own ? 'vos' : profile.name.split(' ')[0]}</h2>
          {profile.bioHidden && (profile.own || profile.canModerate) && <p className="profile-hidden-note" role="note">{profile.own
            ? 'Moderación ocultó tu descripción: los demás no la ven. Editala para sacar lo que no corresponde y moderación la puede volver a mostrar.'
            : 'Descripción oculta por moderación: el resto de las personas no la ve.'}</p>}
          {profile.bio ? <p className="profile-bio">{profile.bio}</p>
            : <p className="profile-empty">{profile.bioHidden ? 'La descripción no está disponible.' : profile.own ? 'Todavía no escribiste una descripción.' : 'Todavía no escribió una descripción.'}</p>}
          {profile.interests.length > 0 && <>
            <h3 className="profile-subtitle">Intereses</h3>
            <ul className="interest-list">{profile.interests.map(item => <li key={item} className="interest-chip">{interestNames[item]}</li>)}</ul>
          </>}
        </section>

        <section className="profile-card" aria-labelledby="activity-title">
          <h2 id="activity-title">Actividad</h2>
          <dl className="profile-stats">
            <div><dt>Preguntas</dt><dd>{profile.stats.questions}</dd></div>
            <div><dt>Respuestas</dt><dd>{profile.stats.answers}</dd></div>
            <div><dt>Marcadas como útiles</dt><dd>{profile.stats.helpful}</dd></div>
          </dl>
          {profile.recentQuestions.length > 0 && <>
            <h3 className="profile-subtitle">Últimas preguntas</h3>
            <ul className="activity-list">{profile.recentQuestions.map(item => <li key={item.id}>
              <Link to={`/preguntas/${item.id}`}>{item.title}</Link>
              <span>{statusNames[item.status]} · {formatDate(item.createdAt)}</span>
            </li>)}</ul>
          </>}
          {profile.recentAnswers.length > 0 && <>
            <h3 className="profile-subtitle">Últimas respuestas</h3>
            <ul className="activity-list">{profile.recentAnswers.map(item => <li key={item.id}>
              <Link to={`/preguntas/${item.questionId}`}>{item.questionTitle}</Link>
              <span>“{item.excerpt}”</span>
            </li>)}</ul>
          </>}
          {!profile.recentQuestions.length && !profile.recentAnswers.length && <p className="profile-empty">{profile.own ? 'Todavía no publicaste preguntas ni respuestas.' : 'Todavía no publicó preguntas ni respuestas.'}</p>}
        </section>
      </div>

      <aside className="profile-card profile-details" aria-labelledby="details-title">
        <h2 id="details-title">Datos</h2>
        <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {profile.own && <p className="profile-empty">Tu correo nunca se muestra en tu perfil.</p>}
      </aside>
    </div>
  </article>;
}
