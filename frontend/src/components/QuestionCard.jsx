import { formatDate } from '../utils/content';

const statusNames = { open: 'Abierta', answered: 'Respondida' };

// Tarjeta de una pregunta: tema, estado, texto, autor (solo primer nombre) y fecha.
export default function QuestionCard({ question, highlighted = false }) {
  return <article className={highlighted ? 'question-card is-new' : 'question-card'}>
    <div className="question-top">
      <p className="card-category">{question.category?.name}{question.institution ? ` · ${question.institution.name}` : ''}</p>
      <span className={question.status === 'answered' ? 'badge badge-official' : 'badge badge-community'}>{statusNames[question.status]}</span>
    </div>
    <h3>{question.title}</h3>
    {question.body && <p className="question-body">{question.body}</p>}
    <p className="card-meta">Preguntó {question.author.name} · {formatDate(question.createdAt)}</p>
  </article>;
}
