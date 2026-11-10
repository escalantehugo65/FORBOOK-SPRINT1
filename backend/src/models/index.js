import { DataTypes } from 'sequelize';

export function defineModels(db) {
  const Institution = db.define('Institution', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: false },
  }, { tableName: 'institutions' });
  const Career = db.define('Career', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(180), allowNull: false },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: false },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: false },
  }, { tableName: 'careers' });
  Institution.hasMany(Career, { foreignKey: 'institutionId', as: 'careers' });
  Career.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  const InstitutionResource = db.define('InstitutionResource', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.STRING(350), allowNull: false },
    url: { type: DataTypes.STRING(1000), allowNull: false },
    availabilityNote: { type: DataTypes.STRING(350), allowNull: true },
    position: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  }, { tableName: 'institution_resources' });
  Institution.hasMany(InstitutionResource, { foreignKey: 'institutionId', as: 'resources' });
  InstitutionResource.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  const Locality = db.define('Locality', {
    id: { type: DataTypes.STRING(8), primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    provinceCode: { type: DataTypes.STRING(2), allowNull: false },
    provinceName: { type: DataTypes.STRING(100), allowNull: true },
    departmentCode: { type: DataTypes.STRING(5), allowNull: false },
    departmentName: { type: DataTypes.STRING(80), allowNull: false },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: false },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: false },
  }, { tableName: 'localities' });
  const User = db.define('User', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    origin: { type: DataTypes.STRING(150), allowNull: false },
    originLocalityId: { type: DataTypes.STRING(8), allowNull: true },
    originCountryCode: { type: DataTypes.STRING(2), allowNull: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    career: { type: DataTypes.STRING(180), allowNull: false },
    arrivalStatus: { type: DataTypes.ENUM('not_arrived', 'arrived'), allowNull: false },
    // Los roles especiales se asignan con npm run user:role, nunca desde el registro (épica 7).
    role: { type: DataTypes.ENUM('student', 'moderator', 'admin'), allowNull: false, defaultValue: 'student' },
  }, { tableName: 'users', defaultScope: { attributes: { exclude: ['passwordHash'] } }, scopes: { withPassword: { attributes: { include: ['passwordHash'] } } } });
  const Category = db.define('Category', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(350), allowNull: false },
  }, { tableName: 'categories' });
  const Content = db.define('Content', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(180), allowNull: false },
    summary: { type: DataTypes.STRING(450), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    sourceType: { type: DataTypes.ENUM('official', 'community', 'experience'), allowNull: false },
    sourceLabel: { type: DataTypes.STRING(250), allowNull: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: true },
    authorLabel: { type: DataTypes.STRING(180), allowNull: true },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft', allowNull: false },
    // Fecha en que moderación ocultó la ficha (FF-37). null = visible.
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'contents' });
  const Session = db.define('Session', {
    sid: { type: DataTypes.STRING(128), primaryKey: true },
    data: { type: DataTypes.TEXT('medium'), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  }, { tableName: 'sessions', timestamps: false });
  Institution.hasMany(User, { foreignKey: 'institutionId', as: 'students' });
  User.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  Category.hasMany(Content, { foreignKey: 'categoryId', as: 'contents' });
  Content.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  Institution.hasMany(Content, { foreignKey: 'institutionId', as: 'contents' });
  Content.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  // Épica 4: lugares del mapa (FF-21 y FF-23) y rutas orientativas (FF-22).
  // Las coordenadas son opcionales: un lugar sin ubicación verificada se muestra igual,
  // solo con su dirección o referencia en texto.
  const sourceFields = {
    sourceType: { type: DataTypes.ENUM('official', 'community', 'experience'), allowNull: false },
    sourceLabel: { type: DataTypes.STRING(250), allowNull: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: true },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft', allowNull: false },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  };
  const Place = db.define('Place', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    kind: { type: DataTypes.ENUM('institution', 'health', 'security', 'procedures', 'transport', 'services'), allowNull: false },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    addressLabel: { type: DataTypes.STRING(250), allowNull: true },
    studentNote: { type: DataTypes.STRING(450), allowNull: true },
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    ...sourceFields,
  }, { tableName: 'places' });
  Institution.hasMany(Place, { foreignKey: 'institutionId', as: 'places' });
  Place.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  const TravelRoute = db.define('TravelRoute', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    destinationPlaceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(180), allowNull: false },
    originLabel: { type: DataTypes.STRING(180), allowNull: false },
    mode: { type: DataTypes.ENUM('walk', 'bus', 'bike', 'car', 'mixed'), allowNull: false },
    // Un paso por línea, con referencias que se reconozcan en la calle.
    steps: { type: DataTypes.TEXT, allowNull: false },
    // Texto libre ("entre 20 y 30 minutos"). Solo se muestra como dato firme si la fuente es oficial.
    durationLabel: { type: DataTypes.STRING(120), allowNull: true },
    ...sourceFields,
  }, { tableName: 'travel_routes' });
  Institution.hasMany(TravelRoute, { foreignKey: 'institutionId', as: 'routes' });
  TravelRoute.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  TravelRoute.belongsTo(Place, { foreignKey: 'destinationPlaceId', as: 'destination' });
  // Épica 6: espacios de integración (FF-30 y FF-31). No hay membresía ni chat privado:
  // cada espacio describe para quién es y, si existe, lleva a una sección pública de Forbook.
  const Group = db.define('Group', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    kind: { type: DataTypes.ENUM('institution', 'origin', 'arrival', 'general'), allowNull: false },
    audience: { type: DataTypes.STRING(300), allowNull: false },
    summary: { type: DataTypes.STRING(300), allowNull: false },
    purpose: { type: DataTypes.TEXT, allowNull: false },
    // Criterios de sugerencia: null o 'any' significa "para todos".
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    originScope: { type: DataTypes.ENUM('any', 'formosa', 'outside'), allowNull: false, defaultValue: 'any' },
    arrivalScope: { type: DataTypes.ENUM('any', 'not_arrived', 'arrived'), allowNull: false, defaultValue: 'any' },
    linkPath: { type: DataTypes.STRING(250), allowNull: true },
    linkLabel: { type: DataTypes.STRING(120), allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft', allowNull: false },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'groups' });
  Institution.hasMany(Group, { foreignKey: 'institutionId', as: 'groups' });
  Group.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  // Preguntas públicas (FF-24 y FF-25).
  const Question = db.define('Question', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('open', 'answered', 'closed'), allowNull: false, defaultValue: 'open' },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'questions' });
  User.hasMany(Question, { foreignKey: 'userId', as: 'questions' });
  Question.belongsTo(User, { foreignKey: 'userId', as: 'author' });
  Category.hasMany(Question, { foreignKey: 'categoryId', as: 'questions' });
  Question.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  Institution.hasMany(Question, { foreignKey: 'institutionId', as: 'questions' });
  Question.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
  // Respuestas de una pregunta (FF-26 y FF-27).
  const Answer = db.define('Answer', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    questionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'answers' });
  Question.hasMany(Answer, { foreignKey: 'questionId', as: 'answers' });
  Answer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });
  User.hasMany(Answer, { foreignKey: 'userId', as: 'answers' });
  Answer.belongsTo(User, { foreignKey: 'userId', as: 'author' });
  // Marcas de "me fue útil" en las respuestas (FF-28): una por usuario y respuesta.
  const AnswerVote = db.define('AnswerVote', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    answerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  }, { tableName: 'answer_votes', updatedAt: false, indexes: [{ unique: true, fields: ['answer_id', 'user_id'], name: 'answer_votes_unique' }] });
  Answer.hasMany(AnswerVote, { foreignKey: 'answerId', as: 'votes' });
  AnswerVote.belongsTo(Answer, { foreignKey: 'answerId', as: 'answer' });
  User.hasMany(AnswerVote, { foreignKey: 'userId', as: 'answerVotes' });
  AnswerVote.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  // Reportes de contenido (FF-34 y FF-35). targetType + targetId señalan qué se reportó.
  const Report = db.define('Report', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    reporterId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    targetType: { type: DataTypes.ENUM('question', 'answer', 'content'), allowNull: false },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reason: { type: DataTypes.ENUM('false', 'offensive', 'spam', 'outdated', 'other'), allowNull: false },
    details: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'dismissed', 'actioned'), allowNull: false, defaultValue: 'pending' },
    action: { type: DataTypes.ENUM('none', 'hide', 'close'), allowNull: true },
    resolutionNote: { type: DataTypes.STRING(500), allowNull: true },
    resolvedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'reports' });
  User.hasMany(Report, { foreignKey: 'reporterId', as: 'reports' });
  Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
  Report.belongsTo(User, { foreignKey: 'resolvedById', as: 'resolver' });
  // Historial interno de moderación (FF-38): una fila por cada decisión o cambio de catálogo.
  const ModerationLog = db.define('ModerationLog', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    moderatorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    action: { type: DataTypes.ENUM('dismiss', 'hide', 'close', 'category_create', 'category_update', 'category_delete', 'source_update', 'place_create', 'place_update'), allowNull: false },
    targetType: { type: DataTypes.ENUM('question', 'answer', 'content', 'category', 'place'), allowNull: false },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reportId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    note: { type: DataTypes.STRING(500), allowNull: false },
  }, { tableName: 'moderation_logs', updatedAt: false });
  ModerationLog.belongsTo(User, { foreignKey: 'moderatorId', as: 'moderator' });
  return { User, Institution, Career, InstitutionResource, Locality, Category, Content, Place, TravelRoute, Group, Question, Answer, AnswerVote, Report, ModerationLog, Session };
}
