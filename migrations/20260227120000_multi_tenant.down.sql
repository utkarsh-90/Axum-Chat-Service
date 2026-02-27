DROP INDEX IF EXISTS idx_room_members_user;
DROP INDEX IF EXISTS idx_room_members_room;

DROP TABLE IF EXISTS room_members;

ALTER TABLE rooms
    DROP COLUMN IF EXISTS owner_user_id;

