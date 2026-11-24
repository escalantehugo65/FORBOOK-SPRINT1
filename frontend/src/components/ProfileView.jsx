import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import LevelBadge from './LevelBadge';
import ProfileEffect from './ProfileEffect';
import { CameraIcon, PointsIcon } from './Icons';
import { formatDate } from '../utils/content';
import { pointsLabel } from '../utils/shop';
import { arrivalNames, ownArrivalNames, badgeNames, interestNames, warningReasons } from '../utils/profile';
import { sanctionLine, sanctionReasonNames, sanctionTypeHints } from '../utils/sanctions';
import { friendsLabel } from '../utils/friends';

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

    {(profile.sanctions?.length > 0 || profile.warnings.length > 0 || profile.pastSanctions > 0) && <section className="profile-warnings" aria-labelledby="warnings-title">
      <h2 id="warnings-title">{profile.sanctions?.length ? (profile.own ? 'Tu cuenta tiene una sanción vigente' : 'Esta cuenta tiene una sanción vigente') : 'Historial de moderación'}</h2>
      {profile.sanctions?.length > 0 && <ul className="profile-sanctions">{profile.sanctions.map(sanction => <li key={sanction.id}>
        <strong>{sanctionLine(sanction)}</strong> · {sanctionReasonNames[sanction.reason]}{sanction.automatic ? ' (por advertencias acumuladas)' : ''}
        {profile.own && sanctionTypeHints[sanction.type] && <p>{sanctionTypeHints[sanction.type]}</p>}
        {sanction.note && <p>{sanction.note}</p>}
      </li>)}</ul>}
      {profile.warnings.length > 0 && <>
        <h3 className="profile-subtitle">{profile.warnings.length === 1 ? '1 advertencia' : `${profile.warnings.length} advertencias`}</h3>
        <ul>{profile.warnings.map(warning => <li key={warning.id}>
          <strong>{warningReasons[warning.reason] || sanctionReasonNames[warning.reason]}</strong> · {formatDate(warning.createdAt)}
          {warning.appeal && <span className="profile-appeal"> · {warning.appeal.status === 'pending' ? 'apelada, en revisión' : warning.appeal.status === 'rejected' ? 'apelación rechazada' : 'apelación aceptada'}</span>}
          {warning.note && <p>{warning.note}</p>}
        </li>)}</ul>
      </>}
      {profile.pastSanctions > 0 && <p className="profile-warning-note">{profile.pastSanctions === 1 ? 'Tuvo 1 sanción que ya terminó.' : `Tuvo ${profile.pastSanctions} sanciones que ya terminaron.`}</p>}
      <p className="profile-warning-note">{profile.own
        ? <>Esto se ve en tu perfil. Si creés que hay un error, <Link to="/sanciones">apelá desde Mis sanciones</Link>.</>
        : 'Sanciones y advertencias que dio el equipo de moderación por lo que publicó esta cuenta.'}</p>
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
            <div><dt>Fichas</dt><dd>{profile.stats.contents ?? 0}</dd></div>
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
          {profile.recentContents?.length > 0 && <>
            <h3 className="profile-subtitle">Fichas que creó</h3>
            <ul className="activity-list">{profile.recentContents.map(item => <li key={item.id}>
              <Link to={`/conozcamos/${item.id}`}>{item.title}</Link>
              <span>{[item.category, formatDate(item.createdAt)].filter(Boolean).join(' · ')}</span>
            </li>)}</ul>
          </>}
          {!profile.recentQuestions.length && !profile.recentAnswers.length && !profile.recentContents?.length && <p className="profile-empty">{profile.own ? 'Todavía no publicaste preguntas, respuestas ni fichas.' : 'Todavía no publicó preguntas, respuestas ni fichas.'}</p>}
        </section>
      </div>

      <div className="profile-side">
        <aside className="profile-card profile-details" aria-labelledby="details-title">
          <h2 id="details-title">Datos</h2>
          <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {profile.own && <p className="profile-empty">Tu correo nunca se muestra en tu perfil.</p>}
        </aside>
        {profile.friendsCount !== undefined && <section className="profile-card profile-friends" aria-labelledby="friends-title">
          <h2 id="friends-title">Amigos <span className="friends-count">{friendsLabel(profile.friendsCount)}</span></h2>
          {profile.friendsPreview?.length > 0
            ? <ul className="friends-preview">{profile.friendsPreview.map(friend => <li key={friend.id}>
              <Link to={`/usuarios/${friend.id}`} title={friend.name}><Avatar person={friend}/><span>{friend.name.split(' ')[0]}</span></Link>
            </li>)}</ul>
            : <p className="profile-empty">{profile.own ? 'Todavía no sumaste amigos.' : 'Todavía no tiene amigos en Forbook.'}</p>}
          <Link className="btn btn-outline btn-small" to={profile.own ? '/amigos' : `/usuarios/${profile.id}/amigos`}>{profile.own ? (profile.friendsCount ? 'Ver mis amigos' : 'Buscar personas') : 'Ver sus amigos'}</Link>
        </section>}
      </div>
    </div>
  </article>;
}
