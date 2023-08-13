DO $$ BEGIN
 CREATE TYPE "role" AS ENUM('admin', 'admin 2', 'normal user 1', 'normal user 2', 'manager 1', 'manager 2');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "status" AS ENUM('locked', 'active');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"submittedAt" timestamp DEFAULT now(),
	"submittedBy" varchar DEFAULT '' NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"iRakyatYN" boolean DEFAULT false NOT NULL,
	"iBizRakyatYN" boolean DEFAULT false NOT NULL,
	"iRakyatStatus" varchar DEFAULT '' NOT NULL,
	"iBizRakyatStatus" varchar DEFAULT '' NOT NULL,
	"submissionStatus" varchar DEFAULT 'New' NOT NULL,
	"approvalStatus" varchar DEFAULT 'Pending' NOT NULL,
	"approvedBy" varchar DEFAULT '' NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"rejectReason" varchar DEFAULT '' NOT NULL,
	"isDeleted" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "password_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"password" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "rejection_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mid" uuid NOT NULL,
	"rejectedDate" timestamp NOT NULL,
	"submissionStatus" varchar NOT NULL,
	"rejectedBy" varchar NOT NULL,
	"reason" varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" role NOT NULL
);

CREATE TABLE IF NOT EXISTS "tokens" (
	"user_id" uuid NOT NULL,
	"token" varchar(256) NOT NULL,
	"token_expiry" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "transaction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"c_rib" double precision NOT NULL,
	"c_rmb" double precision NOT NULL,
	"c_cib" double precision NOT NULL,
	"c_cmb" double precision NOT NULL,
	"n_rib" double precision NOT NULL,
	"n_rmb" double precision NOT NULL,
	"n_cib" double precision NOT NULL,
	"n_cmb" double precision NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"marker" varchar,
	"msg" varchar DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"update_checker" varchar
);

CREATE TABLE IF NOT EXISTS "user_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"password" varchar(256),
	"staff_id" varchar(256) NOT NULL,
	"status" status DEFAULT 'locked' NOT NULL,
	"user_group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "wrong_password_trials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_idx" ON "roles" ("role");
CREATE UNIQUE INDEX IF NOT EXISTS "name_idx" ON "user_groups" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "email_idx" ON "users" ("email");
DO $$ BEGIN
 ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "rejection_logs" ADD CONSTRAINT "rejection_logs_mid_maintenance_logs_id_fk" FOREIGN KEY ("mid") REFERENCES "maintenance_logs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_user_group_id_user_groups_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "user_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "wrong_password_trials" ADD CONSTRAINT "wrong_password_trials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
