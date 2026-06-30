-- Step 1: add DRAFT enum value (must be committed before use in same migration batch)

ALTER TYPE "RentalApplicationStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'PENDING';
