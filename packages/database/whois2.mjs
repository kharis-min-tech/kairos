import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const [m] = await sql`SELECT id, system_role, home_branch_id FROM members WHERE email='james.okonkwo@kairos.local'`;
console.log('systemRole:', m.system_role);
const g = await sql`SELECT r.role_name, mr.scope_kind, mr.is_active FROM member_roles mr JOIN roles r ON r.id=mr.role_id WHERE mr.member_id=${m.id} ORDER BY r.role_name`;
console.log('grants:', g.map(x=>`${x.role_name}@${x.scope_kind}${x.is_active?'':' (inactive)'}`).join(', '));
