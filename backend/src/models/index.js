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
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    career: { type: DataTypes.STRING(180), allowNull: false },
    arrivalStatus: { type: DataTypes.ENUM('not_arrived', 'arrived'), allowNull: false },
    role: { type: DataTypes.ENUM('student', 'admin'), allowNull: false, defaultValue: 'student' },
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
  // Preguntas públicas (FF-24 y FF-25).
  const Question = db.define('Question', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('open', 'answered', 'closed'), allowNull: false, defaultValue: 'open' },
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
  return { User, Institution, Career, InstitutionResource, Locality, Category, Content, Question, Answer, AnswerVote, Session };
}
