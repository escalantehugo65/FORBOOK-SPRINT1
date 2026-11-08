import { Link } from 'react-router-dom';
import { formatDate } from '../utils/content';

export const statusNames = { open: 'Abierta', answered: 'Respondida', closed: 'Cerrada' };
export const statusBadge = { open: 'badge badge-community', answered: 'badge badge-official', closed: 'badge badge-soon' };

// Tarjeta de una pregunta: tema, estado, texto, autor (solo primer nombre) y fecha. Toda la tarjeta abre el detalle.
export default function QuestionCard({ question, highlighted = false }) {
  return <article className={highlighted ? 'question-card is-new' : 'question-card'}>
    <div className="question-top">
      <p className="card-category">{question.category?.name}{question.institution ? ` · ${question.institution.name}` : ''}</p>
      <span className={statusBadge[question.status]}>{statusNames[question.status]}</span>
    </div>
    <h3><Link to={`/preguntas/${question.id}`}>{question.title}</Link></h3>
    {question.body && <p className="question-body">{question.body}</p>}
    <p className="card-meta">Preguntó {question.author.name} · {formatDate(question.createdAt)}</p>
  </article>;
}
