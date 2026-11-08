import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { questionService } from '../services/questions';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDate } from '../utils/content';
import { Loading, ErrorMessage } from '../components/Feedback';
import { ArrowIcon } from '../components/Icons';
import { statusBadge, statusNames } from '../components/QuestionCard';

// Detalle de una pregunta con sus respuestas (FF-26) y formulario para responder (FF-27).
export default function QuestionDetailPage() {
  const { id } = useParams();
  const loader = useCallback(signal => questionService.detail(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const question = result?.data;
  usePageTitle(question?.title || (error?.status === 404 ? 'Pregunta no encontrada' : 'Preguntas'));

  // Las respuestas nuevas se suman acá, sin volver a pedir toda la página.
  const [added, setAdded] = useState([]);
  const [status, setStatus] = useState(null);
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sendError, setSendError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState(null);
  const newAnswer = useRef(null);
  useEffect(() => { setAdded([]); setStatus(null); setText(''); setLastId(null); }, [id]);
  useEffect(() => { newAnswer.current?.focus(); }, [lastId]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const body = text.trim();
    if (body.length < 10 || body.length > 2000) { setFieldError('Escribí entre 10 y 2000 caracteres.'); return; }
    setBusy(true); setSendError(''); setFieldError('');
    try {
      const { data } = await questionService.answer(id, body);
      setAdded(previous => [...previous, data.answer]);
      setStatus(data.status);
      setLastId(data.answer.id);
      setText('');
    } catch (failure) {
      setSendError(failure.message);
      if (failure.fields?.body) setFieldError(failure.fields.body);
      if (failure.status === 409) setStatus('closed');
    } finally { setBusy(false); }
  }

  const back = <Link className="back-link" to="/preguntas"><ArrowIcon/>Volver a Preguntas</Link>;
  if (loading) return <div className="container page"><Loading text="Cargando la pregunta…"/></div>;
  if (error) return <div className="container page">{back}{error.status === 404
    ? <div className="detail-head"><h1>No encontramos esta pregunta.</h1><p className="detail-summary">Puede que la dirección esté mal escrita o que la pregunta ya no exista.</p></div>
    : <ErrorMessage message={error.message} retry={retry}/>}</div>;

  const answers = [...question.answers, ...added];
  const currentStatus = status || question.status;
  const closed = currentStatus === 'closed';

  return <article className="container page">
    {back}
    <header className="question-detail">
      <div className="question-top">
        <p className="card-category">{question.category?.name}{question.institution ? ` · ${question.institution.name}` : ' · Pregunta general'}</p>
        <span className={statusBadge[currentStatus]}>{statusNames[currentStatus]}</span>
      </div>
      <h1>{question.title}</h1>
      {question.body && <p className="question-body">{question.body}</p>}
      <p className="card-meta">Preguntó {question.author.name} · {formatDate(question.createdAt)}</p>
    </header>

    <section className="answers" aria-labelledby="answers-title">
      <h2 id="answers-title">{answers.length ? `${answers.length} ${answers.length === 1 ? 'respuesta' : 'respuestas'}` : 'Respuestas'}</h2>
      {answers.length
        ? <ol className="answer-list">{answers.map(answer => <li key={answer.id} className={answer.id === lastId ? 'answer-card is-new' : 'answer-card'}
            ref={answer.id === lastId ? newAnswer : undefined} tabIndex={answer.id === lastId ? -1 : undefined}>
            <p>{answer.body}</p>
            <p className="card-meta">Respondió {answer.author.name} · {formatDate(answer.createdAt)}</p>
          </li>)}</ol>
        : <div className="empty"><h3>Todavía nadie respondió</h3><p>Si sabés algo sobre esto, tu respuesta puede ayudar a quien recién llega.</p></div>}
      {lastId && <p className="access-notice" role="status">Tu respuesta se publicó.</p>}

      {closed
        ? <p className="access-notice" role="status">Esta pregunta está cerrada y ya no recibe respuestas.</p>
        : <form className="answer-form" onSubmit={submit} noValidate>
          <h3>Tu respuesta</h3>
          {sendError && <div className="alert" role="alert"><p>{sendError}</p></div>}
          <div className="field">
            <label htmlFor="answer-body">Contá lo que sabés <span aria-hidden="true">*</span></label>
            <textarea id="answer-body" rows="5" maxLength={2000} value={text} disabled={busy}
              onChange={event => { setText(event.target.value); setFieldError(''); setSendError(''); }}
              aria-invalid={!!fieldError} aria-describedby={fieldError ? 'answer-error' : 'answer-hint'}/>
            <small id="answer-hint">{text.length}/2000 · Al menos 10 caracteres. Se publica con tu primer nombre y la fecha.</small>
            {fieldError && <small id="answer-error" className="field-error">{fieldError}</small>}
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Publicando…' : 'Publicar respuesta'}</button>
          </div>
        </form>}
    </section>
  </article>;
}
