INSERT INTO board_members (board_id, user_id, role)
SELECT boards.id, workspaces.owner_id, 'admin'::member_role
FROM boards
JOIN workspaces ON workspaces.id = boards.workspace_id
WHERE boards.owner_id <> workspaces.owner_id
ON CONFLICT (board_id, user_id) DO NOTHING;
