ALTER TABLE "users" DROP CONSTRAINT "users_user_group_id_user_groups_id_fk";

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_user_group_id_user_groups_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "user_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
