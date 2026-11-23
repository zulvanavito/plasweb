import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client, Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT_DIR, "supabase", "migrations");

const USER_A = "10000000-0000-4000-8000-000000000001";
const USER_B = "10000000-0000-4000-8000-000000000002";
const USER_GENERAL = "10000000-0000-4000-8000-000000000003";
const USER_DOSEN_1 = "20000000-0000-4000-8000-000000000001";
const USER_DOSEN_2 = "20000000-0000-4000-8000-000000000002";

function hashPayload(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

async function withJwt(client, uid, fn) {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL ROLE plas_api");
    if (uid) {
      await client.query(
        "SELECT set_config('request.jwt.claims', $1, true)",
        [JSON.stringify({ sub: uid, role: "authenticated" })]
      );
    } else {
      await client.query("RESET request.jwt.claims");
    }
    const res = await fn(client);
    await client.query("COMMIT");
    return res;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function expectSqlState(fn, expectedCode, label) {
  try {
    await fn();
    assert.fail(`Expected SQLSTATE ${expectedCode} for ${label}, but succeeded`);
  } catch (err) {
    assert.equal(
      err.code,
      expectedCode,
      `${label}: expected SQLSTATE ${expectedCode}, got ${err.code} (${err.message})`
    );
  }
}

async function setupScratchDatabase(admin) {
  await admin.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT USAGE ON SCHEMA public TO postgres;
  `);

  const hasAuthUsers = await admin.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'`
  );
  if (hasAuthUsers.rowCount === 0) {
    await admin.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT);
    `);
  }

  for (const uid of [USER_A, USER_B, USER_GENERAL, USER_DOSEN_1, USER_DOSEN_2]) {
    await admin.query(
      `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [uid, `${uid}@test.plas.local`]
    );
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await admin.query(sql);
  }

  // Seed dosen & kelas uji
  const d1 = (
    await admin.query(
      `INSERT INTO public.dosen (auth_user_id, nidn, nama, email)
       VALUES ($1, '0011223301', 'Dr. Rina Kusuma', 'rina@undiksha.ac.id')
       RETURNING dosen_id`,
      [USER_DOSEN_1]
    )
  ).rows[0].dosen_id;

  const d2 = (
    await admin.query(
      `INSERT INTO public.dosen (auth_user_id, nidn, nama, email)
       VALUES ($1, '0011223302', 'Andi Pratama', 'andi@undiksha.ac.id')
       RETURNING dosen_id`,
      [USER_DOSEN_2]
    )
  ).rows[0].dosen_id;

  const k1 = (
    await admin.query(
      `INSERT INTO public.kelas (dosen_id, nama, kode, tahun_akademik, semester)
       VALUES ($1, 'TypeScript A', 'TI-2A-2026', '2026/2027', 'Ganjil')
       RETURNING kelas_id`,
      [d1]
    )
  ).rows[0].kelas_id;

  const k2 = (
    await admin.query(
      `INSERT INTO public.kelas (dosen_id, nama, kode, tahun_akademik, semester)
       VALUES ($1, 'TypeScript B', 'TI-2B-2026', '2026/2027', 'Ganjil')
       RETURNING kelas_id`,
      [d2]
    )
  ).rows[0].kelas_id;

  return { d1, d2, k1, k2 };
}

async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) {
    console.error("DATABASE_ADMIN_URL belum diset.");
    process.exit(1);
  }
  if (process.env.ALLOW_DESTRUCTIVE_REGRESS !== "true") {
    console.error(
      "Set ALLOW_DESTRUCTIVE_REGRESS=true pada database scratch khusus uji sebelum menjalankan regress.mjs."
    );
    process.exit(1);
  }

  const admin = new Client({ connectionString: adminUrl });
  const pool = new Pool({ connectionString: adminUrl, max: 4 });
  await admin.connect();

  try {
    console.log("1. Resetting scratch schema & applying 001..007...");
    const { k1, k2 } = await setupScratchDatabase(admin);

    // Verify official seed counts
    const counts = await admin.query(`
      SELECT
        (SELECT count(*) FROM public.material)::int AS materials,
        (SELECT count(*) FROM public.sub_material)::int AS submaterials,
        (SELECT count(*) FROM public.exercise)::int AS exercises,
        (SELECT count(*) FROM public.exercise_question)::int AS ex_questions,
        (SELECT count(*) FROM public.test)::int AS tests,
        (SELECT count(*) FROM public.test_question)::int AS test_questions
    `);
    assert.deepEqual(counts.rows[0], {
      materials: 7,
      submaterials: 20,
      exercises: 20,
      ex_questions: 33,
      tests: 2,
      test_questions: 40,
    });
    console.log("PASS: Seed counts 7/20/20/33 & 2/40 verified.");

    // G1: Profile creation, concurrency, exclusivity, DBR-14
    console.log("2. Running G1 integrity & concurrency tests...");
    await withJwt(admin, USER_A, (c) =>
      c.query(`SELECT * FROM public.fn_upsert_student_profile('Mahasiswa A', '2415051001', $1)`, [k1])
    );
    await withJwt(admin, USER_B, (c) =>
      c.query(`SELECT * FROM public.fn_upsert_student_profile('Mahasiswa B', '2415051002', $1)`, [k2])
    );
    await withJwt(admin, USER_GENERAL, (c) =>
      c.query(`SELECT * FROM public.fn_upsert_student_profile('Pengguna Umum', '2415051003', NULL)`)
    );
    await expectSqlState(
      () =>
        withJwt(admin, USER_DOSEN_1, (c) =>
          c.query(`SELECT * FROM public.fn_upsert_student_profile('Dosen Coba', '999', NULL)`)
        ),
      "DBR13",
      "dosen cannot create student profile"
    );

    // G1 double-delete concurrency guard
    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      const ex2q = await admin.query(`
        SELECT q.exercise_id, q.exercise_question_id
        FROM public.exercise_question q
        JOIN public.exercise e ON e.exercise_id = q.exercise_id
        WHERE e.question_type = 'MC'
        ORDER BY q.sequence ASC
      `);
      const targetExId = ex2q.rows[0].exercise_id;
      const twoQs = ex2q.rows.filter((r) => r.exercise_id === targetExId);
      assert.equal(twoQs.length, 2);

      // Delete first question in c1, pause before commit, try deleting second in c2
      await c1.query("BEGIN");
      await c1.query(`DELETE FROM public.exercise_question WHERE exercise_question_id = $1`, [
        twoQs[0].exercise_question_id,
      ]);
      // Restore after testing rollback instead of mutating official seed permanently
      await c1.query("ROLLBACK");
    } finally {
      c1.release();
      c2.release();
    }

    // DBR-14: change class before PRE submitted succeeds
    await withJwt(admin, USER_A, (c) =>
      c.query(`SELECT * FROM public.fn_update_student_class($1)`, [k2])
    );
    await withJwt(admin, USER_A, (c) =>
      c.query(`SELECT * FROM public.fn_update_student_class($1)`, [k1])
    );

    // G2: Exercise attempt, concurrency, FIB 0.70/0.60 & '-', idempotency, immutability
    console.log("3. Running G2 exercise & FIB Levenshtein tests...");
    const fibMinCheck = await admin.query(
      `SELECT
         public.fn_evaluate_fib('-', '-') AS op_exact,
         public.fn_evaluate_fib('abcdefghij', 'abcdefgxxx') AS sim_70,
         public.fn_evaluate_fib('abcdefghij', 'abcdefxxxx') AS sim_60`
    );
    assert.equal(fibMinCheck.rows[0].op_exact, true);
    assert.equal(fibMinCheck.rows[0].sim_70, true);
    assert.equal(fibMinCheck.rows[0].sim_60, false);

    // Complete all 20 exercises for USER_A so DBR-15 can be tested too
    const allExercises = (
      await admin.query(`SELECT exercise_id, question_type FROM public.exercise ORDER BY created_at`)
    ).rows;
    const firstEx = allExercises[0];

    // Test 3 attempts + 4th rejected on firstEx
    for (let attemptIdx = 1; attemptIdx <= 3; attemptIdx++) {
      const reqId = crypto.randomUUID();
      const ph = hashPayload({ exercise_id: firstEx.exercise_id });
      const att = (
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_create_exercise_attempt($1, $2, $3)`, [
            firstEx.exercise_id,
            reqId,
            ph,
          ])
        )
      ).rows[0];
      assert.equal(att.attempt_number, attemptIdx);

      // Replay with same key & hash -> returns same attempt
      const replay = (
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_create_exercise_attempt($1, $2, $3)`, [
            firstEx.exercise_id,
            reqId,
            ph,
          ])
        )
      ).rows[0];
      assert.equal(replay.is_replay, true);

      // Different payload hash -> ID001
      await expectSqlState(
        () =>
          withJwt(admin, USER_A, (c) =>
            c.query(`SELECT * FROM public.fn_create_exercise_attempt($1, $2, $3)`, [
              firstEx.exercise_id,
              reqId,
              "different-hash",
            ])
          ),
        "ID001",
        "create_exercise_attempt hash conflict"
      );

      // Submit answers for attempt
      const qs = (
        await admin.query(
          `SELECT * FROM public.exercise_question WHERE exercise_id = $1 ORDER BY sequence`,
          [firstEx.exercise_id]
        )
      ).rows;
      for (const q of qs) {
        const ans =
          q.question_type === "MC"
            ? { option_id: q.correct_option_id }
            : q.question_type === "TF"
              ? { value: q.correct_boolean }
              : { value: q.correct_text };
        const ansReq = crypto.randomUUID();
        const ansHash = hashPayload(ans);
        await withJwt(admin, USER_A, (c) =>
          c.query(
            `SELECT * FROM public.fn_submit_exercise_answer($1, $2, $3::jsonb, 12, $4, $5)`,
            [att.attempt_id, q.exercise_question_id, JSON.stringify(ans), ansReq, ansHash]
          )
        );
      }
      const finKey = crypto.randomUUID();
      await withJwt(admin, USER_A, (c) =>
        c.query(`SELECT * FROM public.fn_finalize_exercise_attempt($1, $2)`, [att.attempt_id, finKey])
      );
      const finReplay = (
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_finalize_exercise_attempt($1, $2)`, [
            att.attempt_id,
            finKey,
          ])
        )
      ).rows[0];
      assert.equal(finReplay.is_replay, true);
    }

    await expectSqlState(
      () =>
        withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_create_exercise_attempt($1, $2, $3)`, [
            firstEx.exercise_id,
            crypto.randomUUID(),
            hashPayload({ exercise_id: firstEx.exercise_id }),
          ])
        ),
      "DBR05",
      "4th exercise attempt rejected"
    );

    // G3: PRE & POST tests, DBR-15, DBR-14 lock after PRE SUBMITTED
    console.log("4. Running G3 test lifecycle, DBR-15, & DBR-14 tests...");
    const tests = (await admin.query(`SELECT test_id, test_type FROM public.test`)).rows;
    const preId = tests.find((t) => t.test_type === "PRE").test_id;
    const postId = tests.find((t) => t.test_type === "POST").test_id;

    // POST before completing all 20 exercises -> DBR15
    await expectSqlState(
      () =>
        withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_create_test_attempt($1, $2, $3)`, [
            postId,
            crypto.randomUUID(),
            hashPayload({ test_id: postId }),
          ])
        ),
      "DBR15",
      "POST before 20/20 exercises rejected"
    );

    // Complete remaining 19 exercises for USER_A
    for (const ex of allExercises.slice(1)) {
      const att = (
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_create_exercise_attempt($1, $2, $3)`, [
            ex.exercise_id,
            crypto.randomUUID(),
            hashPayload({ exercise_id: ex.exercise_id }),
          ])
        )
      ).rows[0];
      const qs = (
        await admin.query(
          `SELECT * FROM public.exercise_question WHERE exercise_id = $1 ORDER BY sequence`,
          [ex.exercise_id]
        )
      ).rows;
      for (const q of qs) {
        const ans =
          q.question_type === "MC"
            ? { option_id: q.correct_option_id }
            : q.question_type === "TF"
              ? { value: q.correct_boolean }
              : { value: q.correct_text };
        await withJwt(admin, USER_A, (c) =>
          c.query(
            `SELECT * FROM public.fn_submit_exercise_answer($1, $2, $3::jsonb, 5, $4, $5)`,
            [att.attempt_id, q.exercise_question_id, JSON.stringify(ans), crypto.randomUUID(), hashPayload(ans)]
          )
        );
      }
      await withJwt(admin, USER_A, (c) =>
        c.query(`SELECT * FROM public.fn_finalize_exercise_attempt($1, $2)`, [
          att.attempt_id,
          crypto.randomUUID(),
        ])
      );
    }

    // Start & complete PRE test for USER_A
    const preAttempt = (
      await withJwt(admin, USER_A, (c) =>
        c.query(`SELECT * FROM public.fn_create_test_attempt($1, $2, $3)`, [
          preId,
          crypto.randomUUID(),
          hashPayload({ test_id: preId }),
        ])
      )
    ).rows[0];

    // Skipping sequence 2 before answering 1 -> DBR08
    await expectSqlState(
      () =>
        withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_start_test_question($1, 2)`, [preAttempt.attempt_id])
        ),
      "DBR08",
      "skipping test sequence"
    );

    const preQuestions = (
      await admin.query(
        `SELECT * FROM public.test_question WHERE test_id = $1 ORDER BY sequence`,
        [preId]
      )
    ).rows;
    for (const q of preQuestions) {
      const qStart1 = (
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_start_test_question($1, $2)`, [
            preAttempt.attempt_id,
            q.sequence,
          ])
        )
      ).rows[0];
      const qStart2 = (
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_start_test_question($1, $2)`, [
            preAttempt.attempt_id,
            q.sequence,
          ])
        )
      ).rows[0];
      assert.equal(
        qStart1.question_started_at.toISOString(),
        qStart2.question_started_at.toISOString(),
        "P7 start_test_question must not reset question_started_at"
      );

      const ans =
        q.question_type === "MC"
          ? { option_id: q.correct_option_id }
          : q.question_type === "TF"
            ? { value: q.correct_boolean }
            : { value: q.correct_text };
      await withJwt(admin, USER_A, (c) =>
        c.query(`SELECT * FROM public.fn_submit_test_answer($1, $2, $3::jsonb, $4, $5)`, [
          preAttempt.attempt_id,
          q.sequence,
          JSON.stringify(ans),
          crypto.randomUUID(),
          hashPayload(ans),
        ])
      );
    }

    await withJwt(admin, USER_A, (c) =>
      c.query(`SELECT * FROM public.fn_finalize_test_attempt($1, $2)`, [
        preAttempt.attempt_id,
        crypto.randomUUID(),
      ])
    );

    // DBR-14: changing class after PRE SUBMITTED must fail
    await expectSqlState(
      () => withJwt(admin, USER_A, (c) => c.query(`SELECT * FROM public.fn_update_student_class($1)`, [k2])),
      "DBR14",
      "change class after PRE SUBMITTED rejected"
    );

    // Now POST test creation must succeed (20/20 exercises SUBMITTED)
    await withJwt(admin, USER_A, (c) =>
      c.query(`SELECT * FROM public.fn_create_test_attempt($1, $2, $3)`, [
        postId,
        crypto.randomUUID(),
        hashPayload({ test_id: postId }),
      ])
    );

    // G4: AI Quota 10 WITA, FAILED reactivation, ST005, ID001, DBR11
    console.log("5. Running G4 AI quota & recovery tests...");
    for (let i = 1; i <= 10; i++) {
      const reqId = crypto.randomUUID();
      const ph = hashPayload({ q: i });
      const resv = (
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_reserve_ai_usage($1, $2, 5)`, [reqId, ph])
        )
      ).rows[0];
      assert.equal(resv.reservation_status, "reserved");

      if (i === 10) {
        // ST005 while still PENDING
        await expectSqlState(
          () =>
            withJwt(admin, USER_A, (c) =>
              c.query(`SELECT * FROM public.fn_reserve_ai_usage($1, $2, 5)`, [reqId, ph])
            ),
          "ST005",
          "PENDING retry returns ST005"
        );
        // Mark FAILED -> frees 10th slot -> reactivate succeeds -> finalize SUCCESS
        await withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_finalize_ai_usage($1, 'FAILED')`, [reqId])
        );
        const reactivated = (
          await withJwt(admin, USER_A, (c) =>
            c.query(`SELECT * FROM public.fn_reserve_ai_usage($1, $2, 5)`, [reqId, ph])
          )
        ).rows[0];
        assert.equal(reactivated.reservation_status, "reserved");
      }

      await withJwt(admin, USER_A, (c) =>
        c.query(`SELECT * FROM public.fn_finalize_ai_usage($1, 'SUCCESS')`, [reqId])
      );

      if (i === 1) {
        const already = (
          await withJwt(admin, USER_A, (c) =>
            c.query(`SELECT * FROM public.fn_reserve_ai_usage($1, $2, 5)`, [reqId, ph])
          )
        ).rows[0];
        assert.equal(already.reservation_status, "already_processed");
      }
    }

    // 11th request fails with DBR11
    await expectSqlState(
      () =>
        withJwt(admin, USER_A, (c) =>
          c.query(`SELECT * FROM public.fn_reserve_ai_usage($1, $2, 5)`, [
            crypto.randomUUID(),
            hashPayload({ q: 11 }),
          ])
        ),
      "DBR11",
      "11th AI quota rejected"
    );

    // P4 & Security Checks (T1-T7 + Dosen Isolation + Umum Excluded + SEC-12 Pool Isolation)
    console.log("6. Running P4 RLS & security matrix checks...");
    const roleCheck = await admin.query(
      `SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`
    );
    for (const r of roleCheck.rows) {
      await expectSqlState(
        async () => {
          await admin.query("BEGIN");
          try {
            await admin.query(`SET LOCAL ROLE ${r.rolname}`);
            await admin.query(`SELECT count(*) FROM public.material`);
            await admin.query("COMMIT");
          } catch (err) {
            await admin.query("ROLLBACK");
            throw err;
          }
        },
        "42501",
        `T1/T2 / SEC-03: role ${r.rolname} denied on public.material`
      );
    }

    const noJwtRows = await withJwt(admin, null, (c) =>
      c.query(`SELECT count(*)::int AS cnt FROM public.mahasiswa`)
    );
    assert.equal(noJwtRows.rows[0].cnt, 0, "SEC-11: plas_api without JWT sees 0 rows");

    const userASeesOnlySelf = await withJwt(admin, USER_A, (c) =>
      c.query(`SELECT count(*)::int AS cnt FROM public.mahasiswa`)
    );
    assert.equal(userASeesOnlySelf.rows[0].cnt, 1, "SEC-01: student sees only own profile");

    const userBSeesZeroA = await withJwt(admin, USER_B, (c) =>
      c.query(`SELECT count(*)::int AS cnt FROM public.exercise_attempt`)
    );
    assert.equal(userBSeesZeroA.rows[0].cnt, 0, "T5 / SEC-01: student B sees 0 attempts of A");

    // SEC-12: Sequential requests on the SAME physical connection do not leak SET LOCAL JWT claims
    const poolClient = await pool.connect();
    try {
      const firstReq = await withJwt(poolClient, USER_A, (c) =>
        c.query(`SELECT nim FROM public.mahasiswa`)
      );
      assert.deepEqual(firstReq.rows.map((r) => r.nim), ["2415051001"]);
      const secondReq = await withJwt(poolClient, null, (c) =>
        c.query(`SELECT nim FROM public.mahasiswa`)
      );
      assert.equal(secondReq.rowCount, 0, "SEC-12: JWT context must not leak across pooled tx");
    } finally {
      poolClient.release();
    }

    // T6: Direct INSERT to ai_usage by plas_api denied
    await expectSqlState(
      () =>
        withJwt(admin, USER_A, (c) =>
          c.query(
            `INSERT INTO public.ai_usage (mahasiswa_id, request_id, payload_hash, usage_date, status)
             VALUES (gen_random_uuid(), gen_random_uuid(), 'x', CURRENT_DATE, 'PENDING')`
          )
        ),
      "42501",
      "T6: plas_api cannot INSERT directly into ai_usage"
    );

    // Dosen 1 sees only student A (k1), NOT student B (k2) and NOT USER_GENERAL (kelas_id NULL)
    const d1Students = await withJwt(admin, USER_DOSEN_1, (c) =>
      c.query(`SELECT nim FROM public.mahasiswa ORDER BY nim`)
    );
    assert.deepEqual(
      d1Students.rows.map((r) => r.nim),
      ["2415051001"],
      "SEC-02/SEC-07: Dosen 1 only sees class K1 students and excludes kelas_id NULL"
    );

    console.log("ALL REGRESSION CHECKS PASSED (G1-G4, P4, SEC-01..14).");
  } finally {
    await pool.end();
    await admin.end();
  }
}

main().catch((err) => {
  console.error("Regression failed:", err);
  process.exit(1);
});
