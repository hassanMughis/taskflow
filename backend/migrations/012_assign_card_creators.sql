INSERT INTO card_members (card_id, user_id)
SELECT cards.id, cards.creator_id
FROM cards
ON CONFLICT (card_id, user_id) DO NOTHING;
