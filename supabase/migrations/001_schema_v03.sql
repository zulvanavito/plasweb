-- ============================================================================
-- 001_schema_v03.sql — PLAS-TypeScript PostgreSQL 16 Schema (v0.3 + P10-P15)
-- Selaras dengan Blueprint DDL v0.3 dan kontrak aktual client plasmobile.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- 1. MATERIAL
CREATE TABLE public.material (
    material_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence SMALLINT NOT NULL UNIQUE CHECK (sequence > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SUB MATERIAL
CREATE TABLE public.sub_material (
    submaterial_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.material(material_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sequence SMALLINT NOT NULL CHECK (sequence > 0),
    UNIQUE (material_id, sequence)
);

-- 13. MAHASISWA (dibuat sebelum tabel yang mereferensikannya)
CREATE TABLE public.mahasiswa (
    mahasiswa_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nim VARCHAR(30) NOT NULL UNIQUE,
    nama VARCHAR(255) NOT NULL,
    kelas_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. DOSEN
CREATE TABLE public.dosen (
    dosen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nidn VARCHAR(30) NOT NULL UNIQUE,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. KELAS
CREATE TABLE public.kelas (
    kelas_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dosen_id UUID NOT NULL REFERENCES public.dosen(dosen_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) NOT NULL UNIQUE,
    tahun_akademik VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL
);

ALTER TABLE public.mahasiswa
    ADD CONSTRAINT fk_mahasiswa_kelas FOREIGN KEY (kelas_id)
    REFERENCES public.kelas(kelas_id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 3. EXERCISE
CREATE TABLE public.exercise (
    exercise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submaterial_id UUID NOT NULL UNIQUE REFERENCES public.sub_material(submaterial_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    question_type VARCHAR(3) NOT NULL CHECK (question_type IN ('MC', 'TF', 'FIB')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EXERCISE QUESTION
CREATE TABLE public.exercise_question (
    exercise_question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercise(exercise_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    question_text TEXT NOT NULL,
    question_type VARCHAR(3) NOT NULL CHECK (question_type IN ('MC', 'TF', 'FIB')),
    correct_option_id UUID,
    correct_boolean BOOLEAN,
    correct_text TEXT,
    explanation TEXT,
    hint TEXT,
    sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 3),
    UNIQUE (exercise_id, sequence),
    CHECK (
        (question_type = 'MC' AND correct_option_id IS NOT NULL AND correct_boolean IS NULL AND correct_text IS NULL) OR
        (question_type = 'TF' AND correct_option_id IS NULL AND correct_boolean IS NOT NULL AND correct_text IS NULL) OR
        (question_type = 'FIB' AND correct_option_id IS NULL AND correct_boolean IS NULL AND correct_text IS NOT NULL AND length(btrim(correct_text)) > 0)
    )
);

-- 5. EXERCISE QUESTION OPTION (tanpa is_correct — P5)
CREATE TABLE public.exercise_question_option (
    exercise_question_option_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_question_id UUID NOT NULL REFERENCES public.exercise_question(exercise_question_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    option_text TEXT NOT NULL,
    sequence SMALLINT NOT NULL CHECK (sequence > 0),
    UNIQUE (exercise_question_id, sequence),
    UNIQUE (exercise_question_id, exercise_question_option_id)
);

ALTER TABLE public.exercise_question
    ADD CONSTRAINT fk_exercise_question_correct_option
    FOREIGN KEY (exercise_question_id, correct_option_id)
    REFERENCES public.exercise_question_option(exercise_question_id, exercise_question_option_id)
    DEFERRABLE INITIALLY DEFERRED;

-- 6. EXERCISE ATTEMPT
CREATE TABLE public.exercise_attempt (
    exercise_attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(mahasiswa_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    exercise_id UUID NOT NULL REFERENCES public.exercise(exercise_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    attempt_no SMALLINT NOT NULL CHECK (attempt_no BETWEEN 1 AND 3),
    creation_request_id UUID NOT NULL UNIQUE,
    payload_hash TEXT NOT NULL,
    finalization_request_id UUID UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED')),
    score NUMERIC(5,2) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
    UNIQUE (mahasiswa_id, exercise_id, attempt_no),
    CHECK (submitted_at IS NULL OR submitted_at >= started_at),
    CHECK (
        (status = 'IN_PROGRESS' AND submitted_at IS NULL AND score IS NULL AND finalization_request_id IS NULL) OR
        (status = 'SUBMITTED' AND submitted_at IS NOT NULL AND score IS NOT NULL)
    )
);

-- 7. EXERCISE ANSWER (dibuat saat submit; termasuk question_sequence dan answered_at untuk DTO)
CREATE TABLE public.exercise_answer (
    exercise_answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_attempt_id UUID NOT NULL REFERENCES public.exercise_attempt(exercise_attempt_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    exercise_question_id UUID NOT NULL REFERENCES public.exercise_question(exercise_question_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    question_sequence SMALLINT NOT NULL CHECK (question_sequence BETWEEN 1 AND 3),
    submission_request_id UUID NOT NULL UNIQUE,
    payload_hash TEXT NOT NULL,
    question_snapshot TEXT NOT NULL,
    question_type_snapshot VARCHAR(3) NOT NULL CHECK (question_type_snapshot IN ('MC', 'TF', 'FIB')),
    options_snapshot JSONB,
    correct_answer_snapshot JSONB NOT NULL,
    student_answer JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER NOT NULL CHECK (time_spent_seconds >= 0),
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exercise_attempt_id, exercise_question_id),
    CHECK (options_snapshot IS NULL OR jsonb_typeof(options_snapshot) = 'array'),
    CHECK (
        (question_type_snapshot = 'MC'
            AND correct_answer_snapshot ? 'option_id'
            AND jsonb_typeof(correct_answer_snapshot->'option_id') = 'string'
            AND student_answer ? 'option_id'
            AND jsonb_typeof(student_answer->'option_id') = 'string')
     OR (question_type_snapshot = 'TF'
            AND jsonb_typeof(correct_answer_snapshot->'value') = 'boolean'
            AND jsonb_typeof(student_answer->'value') = 'boolean')
     OR (question_type_snapshot = 'FIB'
            AND jsonb_typeof(correct_answer_snapshot->'value') = 'string'
            AND jsonb_typeof(student_answer->'value') = 'string')
    )
);

-- 8. TEST: hanya satu PRE dan satu POST untuk seluruh penelitian.
CREATE TABLE public.test (
    test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    test_type VARCHAR(8) NOT NULL UNIQUE CHECK (test_type IN ('PRE', 'POST')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TEST QUESTION
CREATE TABLE public.test_question (
    test_question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.test(test_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    question_type VARCHAR(3) NOT NULL CHECK (question_type IN ('MC', 'TF', 'FIB')),
    question_text TEXT NOT NULL,
    correct_option_id UUID,
    correct_boolean BOOLEAN,
    correct_text TEXT,
    sequence SMALLINT NOT NULL CHECK (sequence > 0),
    UNIQUE (test_id, sequence),
    CHECK (
        (question_type = 'MC' AND correct_option_id IS NOT NULL AND correct_boolean IS NULL AND correct_text IS NULL) OR
        (question_type = 'TF' AND correct_option_id IS NULL AND correct_boolean IS NOT NULL AND correct_text IS NULL) OR
        (question_type = 'FIB' AND correct_option_id IS NULL AND correct_boolean IS NULL AND correct_text IS NOT NULL AND length(btrim(correct_text)) > 0)
    )
);

-- 10. TEST QUESTION OPTION (tanpa is_correct — P5)
CREATE TABLE public.test_question_option (
    test_question_option_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_question_id UUID NOT NULL REFERENCES public.test_question(test_question_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    option_text TEXT NOT NULL,
    sequence SMALLINT NOT NULL CHECK (sequence > 0),
    UNIQUE (test_question_id, sequence),
    UNIQUE (test_question_id, test_question_option_id)
);

ALTER TABLE public.test_question
    ADD CONSTRAINT fk_test_question_correct_option
    FOREIGN KEY (test_question_id, correct_option_id)
    REFERENCES public.test_question_option(test_question_id, test_question_option_id)
    DEFERRABLE INITIALLY DEFERRED;

-- 11. TEST ATTEMPT
CREATE TABLE public.test_attempt (
    test_attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(mahasiswa_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    test_id UUID NOT NULL REFERENCES public.test(test_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    creation_request_id UUID NOT NULL UNIQUE,
    payload_hash TEXT NOT NULL,
    finalization_request_id UUID UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED')),
    score NUMERIC(5,2) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
    UNIQUE (mahasiswa_id, test_id),
    CHECK (submitted_at IS NULL OR submitted_at >= started_at),
    CHECK (
        (status = 'IN_PROGRESS' AND submitted_at IS NULL AND score IS NULL AND finalization_request_id IS NULL) OR
        (status = 'SUBMITTED' AND submitted_at IS NOT NULL AND score IS NOT NULL)
    )
);

-- 12. TEST ANSWER: satu row per soal disnapshot saat attempt dibuat.
CREATE TABLE public.test_answer (
    test_answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_attempt_id UUID NOT NULL REFERENCES public.test_attempt(test_attempt_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    test_question_id UUID NOT NULL REFERENCES public.test_question(test_question_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    question_sequence SMALLINT NOT NULL CHECK (question_sequence > 0),
    submission_request_id UUID UNIQUE,
    payload_hash TEXT,
    question_snapshot TEXT NOT NULL,
    question_type_snapshot VARCHAR(3) NOT NULL CHECK (question_type_snapshot IN ('MC', 'TF', 'FIB')),
    options_snapshot JSONB,
    correct_answer_snapshot JSONB NOT NULL,
    option_order_snapshot JSONB,
    selected_option_id UUID,
    student_boolean BOOLEAN,
    student_text TEXT,
    is_correct BOOLEAN,
    question_started_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,
    time_spent_seconds INTEGER CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0),
    UNIQUE (test_attempt_id, test_question_id),
    UNIQUE (test_attempt_id, question_sequence),
    CHECK (options_snapshot IS NULL OR jsonb_typeof(options_snapshot) = 'array'),
    CHECK (option_order_snapshot IS NULL OR jsonb_typeof(option_order_snapshot) = 'array'),
    CHECK (
        (question_type_snapshot = 'MC'
            AND correct_answer_snapshot ? 'option_id'
            AND jsonb_typeof(correct_answer_snapshot->'option_id') = 'string')
     OR (question_type_snapshot = 'TF'
            AND jsonb_typeof(correct_answer_snapshot->'value') = 'boolean')
     OR (question_type_snapshot = 'FIB'
            AND jsonb_typeof(correct_answer_snapshot->'value') = 'string')
    ),
    CHECK (
        (answered_at IS NULL
            AND selected_option_id IS NULL AND student_boolean IS NULL AND student_text IS NULL
            AND is_correct IS NULL AND time_spent_seconds IS NULL
            AND submission_request_id IS NULL AND payload_hash IS NULL)
     OR (answered_at IS NOT NULL
            AND is_correct IS NOT NULL AND time_spent_seconds IS NOT NULL
            AND submission_request_id IS NOT NULL AND payload_hash IS NOT NULL)
    ),
    CHECK (answered_at IS NULL OR (question_started_at IS NOT NULL AND answered_at >= question_started_at)),
    CHECK (
        (question_type_snapshot = 'MC' AND student_boolean IS NULL AND student_text IS NULL) OR
        (question_type_snapshot = 'TF' AND selected_option_id IS NULL AND student_text IS NULL) OR
        (question_type_snapshot = 'FIB' AND selected_option_id IS NULL AND student_boolean IS NULL)
    ),
    CHECK (
        answered_at IS NULL OR
        (question_type_snapshot = 'MC' AND selected_option_id IS NOT NULL) OR
        (question_type_snapshot = 'TF' AND student_boolean IS NOT NULL) OR
        (question_type_snapshot = 'FIB' AND student_text IS NOT NULL)
    )
);

-- 16. AI USAGE
CREATE TABLE public.ai_usage (
    ai_usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mahasiswa_id UUID NOT NULL REFERENCES public.mahasiswa(mahasiswa_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    request_id UUID NOT NULL UNIQUE,
    payload_hash TEXT NOT NULL,
    usage_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CHECK ((status = 'PENDING' AND processed_at IS NULL) OR (status IN ('SUCCESS', 'FAILED') AND processed_at IS NOT NULL))
);

-- Indeks pendukung
CREATE INDEX idx_sub_material_material ON public.sub_material(material_id);
CREATE INDEX idx_exercise_question_exercise ON public.exercise_question(exercise_id);
CREATE INDEX idx_exercise_attempt_student_exercise ON public.exercise_attempt(mahasiswa_id, exercise_id);
CREATE INDEX idx_exercise_attempt_exercise_status ON public.exercise_attempt(exercise_id, status);
CREATE INDEX idx_test_question_test ON public.test_question(test_id);
CREATE INDEX idx_test_attempt_student ON public.test_attempt(mahasiswa_id);
CREATE INDEX idx_test_attempt_test_status ON public.test_attempt(test_id, status);
CREATE INDEX idx_mahasiswa_kelas ON public.mahasiswa(kelas_id);
CREATE INDEX idx_kelas_dosen ON public.kelas(dosen_id);
CREATE INDEX idx_ai_usage_student_date_status ON public.ai_usage(mahasiswa_id, usage_date, status);
CREATE INDEX idx_ai_usage_pending_reserved ON public.ai_usage(reserved_at) WHERE status = 'PENDING';
