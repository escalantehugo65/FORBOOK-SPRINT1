import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { Community } from '../src/models/community.model.js';
import { CommunityRole } from '../src/models/community_role.model.js';
import { CommunityMember } from '../src/models/community_member.model.js';
import { CommunityMessage } from '../src/models/community_message.model.js';
import { CommunityAttachment } from '../src/models/community_attachment.model.js';
import { UserBlock } from '../src/models/user_block.model.js';
import { MissionClaim } from '../src/models/mission_claim.model.js';
import { PointTransaction } from '../src/models/point_transaction.model.js';

// Comunidades con chat, roles, bloqueos entre personas y misiones. Se puede ejecutar más de una vez.
export async function up() {
  const query = sequelize.getQueryInterface();
  for (const model of [Community, CommunityRole, CommunityMember, CommunityMessage, CommunityAttachment, UserBlock, MissionClaim]) {
    await query.createTable(model.getTableName(), tableColumns(model));
  }
  const index = async (table, columns, name, unique = false) => {
    const existing = await query.showIndex(table);
    if (!existing.some(item => item.name === name)) await query.addIndex(table, columns, { name, unique });
  };
  await index('community_members', ['community_id', 'user_id'], 'community_members_unique', true);
  await index('community_members', ['user_id', 'status'], 'community_members_user');
  await index('community_messages', ['community_id', 'id'], 'community_messages_chat');
  await index('community_messages', ['user_id', 'created_at'], 'community_messages_author');
  await index('user_blocks', ['user_id', 'target_id'], 'user_blocks_unique', true);
  await index('user_blocks', ['target_id', 'kind'], 'user_blocks_target');
  await index('mission_claims', ['user_id', 'mission_key', 'period'], 'mission_claims_unique', true);
  await query.changeColumn('point_transactions', 'reason', PointTransaction.getAttributes().reason);
}
