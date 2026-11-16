import { onlyTheseFilters, pageQuery } from './common.validation.js';

// FF-38: GET /moderation/log?page=2
export const getModerationLogValidation = [onlyTheseFilters([pageQuery()])];
