-- Add device_id to kahoot_players to track unique devices per room
ALTER TABLE kahoot_players 
ADD COLUMN device_id TEXT;

-- Update the unique constraint (optional, depends on if we want strict enforcement at DB level)
-- DROP INDEX IF EXISTS idx_kahoot_players_room_nickname;
-- CREATE UNIQUE INDEX idx_kahoot_players_room_device ON kahoot_players(room_id, device_id);
-- Keeping simple for now, logic will handle it.
