-- Update responses table
ALTER TABLE "public"."responses"
ADD COLUMN "trial_type" text NOT NULL DEFAULT 'pair' CHECK (trial_type IN ('single', 'pair')),
ADD COLUMN "selected_verdict" boolean,
ADD COLUMN "single_stimulus" "uuid",
ALTER COLUMN "left_stimulus" DROP NOT NULL,
ALTER COLUMN "right_stimulus" DROP NOT NULL;

