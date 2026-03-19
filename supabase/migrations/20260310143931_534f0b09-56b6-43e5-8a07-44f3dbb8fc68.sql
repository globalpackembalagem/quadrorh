
-- Enable armários permissions for SILVIA
UPDATE user_roles 
SET pode_visualizar_armarios = true, pode_editar_armarios = true 
WHERE id = '32ca7574-9924-4a81-87af-817ef1ca8153';

-- Add missing decoration sectors for SILVIA (skip if already exists)
INSERT INTO user_roles_setores (user_role_id, setor_id) VALUES
  ('32ca7574-9924-4a81-87af-817ef1ca8153', '468236be-28f2-4e77-978c-996c31fa2bfa'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', '15f43167-549b-45a2-b661-d0f8b8358c16'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', '2f249626-508b-43fd-a2e0-c02b917f91f7'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', 'a32f15e9-7524-411c-a1e0-50255cd1f4a9'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', '7240ebe5-5c5c-419b-b3dd-9c47fdd38856'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', '96de0c48-968b-4130-b6d7-789daf02aea8'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', '9d7a0813-5f9a-45ee-b1c3-0f59c8b2e585'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', 'acfecda7-bf36-465b-a533-d8fd275b9336'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', 'fd592c70-9b06-4ae9-97c0-4728cd741253'),
  ('32ca7574-9924-4a81-87af-817ef1ca8153', 'e5a2212a-1834-4d30-a04c-5b99a2610038')
ON CONFLICT (user_role_id, setor_id) DO NOTHING;
