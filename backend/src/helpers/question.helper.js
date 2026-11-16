import { publicAuthor } from './user.helper.js';

// Lo que se muestra de una pregunta. Del autor, solo el nombre de pila.
export const publicQuestion = (question) => ({
  id: question.id,
  title: question.title,
  body: question.body,
  status: question.status,
  createdAt: question.createdAt,
  category: question.category,
  institution: question.institution,
  author: publicAuthor(question.author),
});

// helpfulCount: cuántas personas la marcaron útil. markedByMe y ownAnswer dependen de quién mira.
export const publicAnswer = (answer, userId, votes = []) => ({
  id: answer.id,
  body: answer.body,
  createdAt: answer.createdAt,
  author: publicAuthor(answer.author),
  helpfulCount: votes.filter(vote => vote.answerId === answer.id).length,
  markedByMe: votes.some(vote => vote.answerId === answer.id && vote.userId === userId),
  ownAnswer: answer.userId === userId,
});
