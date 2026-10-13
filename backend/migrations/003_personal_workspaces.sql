INSERT INTO workspaces (name, owner_id, is_private)
SELECT LEFT(users.name, 88) || '''s Workspace', users.id, TRUE
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces WHERE workspaces.owner_id = users.id
);

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT workspaces.id, workspaces.owner_id, 'owner'::member_role
FROM workspaces
WHERE NOT EXISTS (
  SELECT 1
  FROM workspace_members
  WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = workspaces.owner_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;
