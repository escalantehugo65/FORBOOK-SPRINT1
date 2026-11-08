import { Router } from 'express';
import { asyncRoute } from '../helpers/http.js';
import { requireAuth, authRateLimit } from '../middlewares/security.js';
import { authController } from '../controllers/authController.js';
import { contentController } from '../controllers/contentController.js';
import { questionController } from '../controllers/questionController.js';

export function apiRoutes(models, cookieOptions) {
  const router = Router();
  const auth = authController(models, cookieOptions);
  const content = contentController(models);
  const questions = questionController(models);
  const limit = authRateLimit();
  const questionLimit = authRateLimit();
  router.post('/auth/register', limit, asyncRoute(auth.register));
  router.post('/auth/login', limit, asyncRoute(auth.login));
  router.get('/auth/me', requireAuth, asyncRoute(auth.me));
  router.post('/auth/logout', asyncRoute(auth.logout));
  router.get('/origin-localities', asyncRoute(content.localities));
  router.get('/institutions', asyncRoute(content.institutions));
  router.get('/institutions/:id/careers', asyncRoute(content.careers));
  router.get('/institution-resources', requireAuth, asyncRoute(content.resources));
  router.get('/categories', requireAuth, asyncRoute(content.categories));
  router.get('/contents', requireAuth, asyncRoute(content.list));
  router.get('/contents/:id', requireAuth, asyncRoute(content.detail));
  router.get('/questions', requireAuth, asyncRoute(questions.list));
  router.post('/questions', requireAuth, questionLimit, asyncRoute(questions.create));
  router.get('/questions/:id', requireAuth, asyncRoute(questions.detail));
  router.post('/questions/:id/answers', requireAuth, questionLimit, asyncRoute(questions.answer));
  router.put('/answers/:id/helpful', requireAuth, questionLimit, asyncRoute(questions.markHelpful));
  router.delete('/answers/:id/helpful', requireAuth, questionLimit, asyncRoute(questions.unmarkHelpful));
  return router;
}
