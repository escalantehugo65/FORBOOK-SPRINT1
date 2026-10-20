import { DataTypes } from 'sequelize';

export function defineModels(db) {
  const Institution = db.define('Institution', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: false },
  }, { tableName: 'institutions' });
  const User = db.define('User', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    origin: { type: DataTypes.STRING(150), allowNull: false },
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
  return { User, Institution, Category, Content, Session };
}
