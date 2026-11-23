import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const DEFAULT_PLAS_DIR =
  "C:\\Users\\shawn\\Documents\\Secondbrain\\01 Projects\\PLAS";
const PLAS_DIR = process.env.PLAS_BLUEPRINT_DIR || DEFAULT_PLAS_DIR;

const CONTENT_FILE = path.join(
  PLAS_DIR,
  "Konten Materi dan Exercise PLAS-TypeScript.md"
);
const TEST_BANK_FILE = path.join(
  PLAS_DIR,
  "Bank Soal Pre-Test dan Post-Test PLAS-TypeScript.md"
);
const OUTPUT_FILE = path.join(
  ROOT_DIR,
  "supabase",
  "migrations",
  "007_seed_official_content.sql"
);

/**
 * Deterministic UUID v4-shaped identifier from SHA-256 so re-runs produce identical SQL.
 */
function deterministicUuid(key) {
  const hash = crypto.createHash("sha256").update(`plas-ts:${key}`).digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeFib(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function dedentQuestionBlock(lines) {
  return lines
    .map((line) => (line.startsWith("   ") ? line.slice(3) : line))
    .join("\n")
    .trim();
}

function cleanOptionText(raw) {
  return raw.replace(/\s*\*\(Benar\)\*\s*$/, "").trim();
}

function parseMaterialsAndExercises(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const materials = [];

  let i = 0;
  while (i < lines.length) {
    const matMatch = lines[i].match(
      /^## Materi (\d+): (.+?) \(`sequence = (\d+)`\)\s*$/
    );
    if (!matMatch) {
      i++;
      continue;
    }

    const materialSeq = Number(matMatch[3]);
    const materialTitle = matMatch[2].trim();
    i++;

    let description = "";
    while (i < lines.length && !lines[i].startsWith("### SubMateri ")) {
      const descMatch = lines[i].match(/^\*\*Deskripsi:\*\*\s*(.+)$/);
      if (descMatch) {
        description = descMatch[1].trim();
      }
      i++;
    }

    const submaterials = [];
    while (i < lines.length && !lines[i].startsWith("## Materi ")) {
      const subMatch = lines[i].match(/^### SubMateri (\d+)\.(\d+): (.+)$/);
      if (!subMatch) {
        i++;
        continue;
      }

      const subMatNum = Number(subMatch[1]);
      const subSeq = Number(subMatch[2]);
      const subTitle = subMatch[3].trim();
      if (subMatNum !== materialSeq) {
        throw new Error(
          `SubMateri ${subMatNum}.${subSeq} tidak cocok dengan Materi ${materialSeq}`
        );
      }
      i++;

      while (i < lines.length && lines[i].trim() !== "```markdown") {
        i++;
      }
      if (i >= lines.length) {
        throw new Error(`Blok markdown tidak ditemukan di SubMateri ${subMatNum}.${subSeq}`);
      }
      i++; // skip ```markdown

      const contentLines = [];
      while (i < lines.length && !lines[i].startsWith("#### Exercise ")) {
        contentLines.push(lines[i]);
        i++;
      }

      while (
        contentLines.length > 0 &&
        contentLines[contentLines.length - 1].trim() === ""
      ) {
        contentLines.pop();
      }
      if (
        contentLines.length === 0 ||
        contentLines[contentLines.length - 1].trim() !== "```"
      ) {
        throw new Error(
          `Penutup fence markdown tidak ditemukan di SubMateri ${subMatNum}.${subSeq}`
        );
      }
      contentLines.pop();
      const contentMarkdown = contentLines.join("\n").trim();

      const exMatch = lines[i]?.match(
        /^#### Exercise (\d+)\.(\d+) \(`question_type = (MC|TF|FIB)`, (\d+) Soal\)\s*$/
      );
      if (!exMatch) {
        throw new Error(`Header Exercise tidak ditemukan di SubMateri ${subMatNum}.${subSeq}`);
      }
      const questionType = exMatch[3];
      const expectedCount = Number(exMatch[4]);
      i++;

      const questions = [];
      while (
        i < lines.length &&
        !lines[i].startsWith("### SubMateri ") &&
        !lines[i].startsWith("## Materi ")
      ) {
        const qMatch = lines[i].match(
          /^\d+\.\s+\*\*Soal (\d+) \(`sequence = (\d+)`\):\*\*\s*$/
        );
        if (!qMatch) {
          i++;
          continue;
        }
        const qSeq = Number(qMatch[2]);
        i++;

        const qBlock = [];
        while (
          i < lines.length &&
          !/^\d+\.\s+\*\*Soal /.test(lines[i]) &&
          !lines[i].startsWith("---") &&
          !lines[i].startsWith("### SubMateri ") &&
          !lines[i].startsWith("## Materi ")
        ) {
          qBlock.push(lines[i]);
          i++;
        }

        const questionTextLines = [];
        const options = [];
        let correctLetter = null;
        let tfOrFibKey = null;
        let hint = null;
        let explanation = null;

        for (const rawLine of qBlock) {
          const optMatch = rawLine.match(/^\s*-\s+([A-D])\.\s+(.+)$/);
          const keyMatch = rawLine.match(/^\s*-\s+\*\*Kunci:\*\*\s+`([^`]+)`/);
          const hintMatch = rawLine.match(/^\s*-\s+\*\*Hint:\*\*\s+(.+)$/);
          const expMatch = rawLine.match(/^\s*-\s+\*\*Explanation:\*\*\s+(.+)$/);

          if (optMatch) {
            const letter = optMatch[1];
            const isCorrect = /\*\(Benar\)\*/.test(optMatch[2]);
            if (isCorrect) correctLetter = letter;
            options.push({
              letter,
              sequence: options.length + 1,
              text: cleanOptionText(optMatch[2]),
            });
          } else if (keyMatch) {
            tfOrFibKey = keyMatch[1];
          } else if (hintMatch) {
            hint = hintMatch[1].trim();
          } else if (expMatch) {
            explanation = expMatch[1].trim();
          } else {
            questionTextLines.push(rawLine);
          }
        }

        const questionText = dedentQuestionBlock(questionTextLines);
        questions.push({
          sequence: qSeq,
          questionType,
          questionText,
          options,
          correctLetter,
          tfOrFibKey,
          hint,
          explanation,
        });
      }

      if (questions.length !== expectedCount) {
        throw new Error(
          `Exercise ${subMatNum}.${subSeq}: jumlah soal ${questions.length} != ${expectedCount}`
        );
      }

      submaterials.push({
        sequence: subSeq,
        title: subTitle,
        contentMarkdown,
        exercise: {
          title: `Latihan ${subMatNum}.${subSeq}: ${subTitle}`,
          questionType,
          questions,
        },
      });
    }

    materials.push({
      sequence: materialSeq,
      title: materialTitle,
      description,
      submaterials,
    });
  }

  return materials;
}

function parseTestBank(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections = { PRE: [], POST: [] };
  let activeType = null;
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith("## Bagian A: Soal Pre-Test")) {
      activeType = "PRE";
      i++;
      continue;
    }
    if (lines[i].startsWith("## Bagian B: Soal Post-Test")) {
      activeType = "POST";
      i++;
      continue;
    }

    const qMatch = lines[i].match(
      /^### No\. (\d+) \(`(MC|TF|FIB)` \| Materi \d+: .+? \| Indikator: .+?\)\s*$/
    );
    if (!qMatch || !activeType) {
      i++;
      continue;
    }

    const sequence = Number(qMatch[1]);
    const questionType = qMatch[2];
    i++;

    const qLines = [];
    const options = [];
    let correctLetter = null;
    let tfOrFibKey = null;

    while (
      i < lines.length &&
      !lines[i].startsWith("---") &&
      !lines[i].startsWith("## Bagian ")
    ) {
      const rawLine = lines[i];
      const optMatch = rawLine.match(/^-\s+([A-D])\.\s+(.+)$/);
      const kunciMcMatch = rawLine.match(/^\*\*Kunci:\*\*\s+Opsi ([A-D])\b/);
      const kunciValMatch = rawLine.match(/^\*\*Kunci:\*\*\s+`([^`]+)`/);

      if (optMatch) {
        const letter = optMatch[1];
        if (/\*\(Benar\)\*/.test(optMatch[2])) {
          correctLetter = letter;
        }
        options.push({
          letter,
          sequence: options.length + 1,
          text: cleanOptionText(optMatch[2]),
        });
      } else if (kunciMcMatch) {
        correctLetter = correctLetter || kunciMcMatch[1];
      } else if (kunciValMatch) {
        tfOrFibKey = kunciValMatch[1];
      } else {
        qLines.push(rawLine);
      }
      i++;
    }

    sections[activeType].push({
      sequence,
      questionType,
      questionText: qLines.join("\n").trim(),
      options,
      correctLetter,
      tfOrFibKey,
    });
  }

  return sections;
}

function validateParsed(materials, testBank) {
  if (materials.length !== 7) {
    throw new Error(`Harus ada 7 Materi, ditemukan ${materials.length}`);
  }

  let subCount = 0;
  let exCount = 0;
  let qCount = 0;
  let optCount = 0;
  const typeCounts = { MC: 0, TF: 0, FIB: 0 };

  for (const mat of materials) {
    for (const sub of mat.submaterials) {
      subCount++;
      exCount++;
      if (!sub.contentMarkdown) {
        throw new Error(`Konten kosong pada ${mat.sequence}.${sub.sequence}`);
      }
      for (const q of sub.exercise.questions) {
        qCount++;
        typeCounts[q.questionType]++;
        if (q.questionType === "MC") {
          if (q.options.length !== 4 || !q.correctLetter) {
            throw new Error(`Soal MC exercise ${mat.sequence}.${sub.sequence} #${q.sequence} tidak valid`);
          }
          optCount += q.options.length;
        } else if (q.questionType === "TF") {
          if (q.tfOrFibKey !== "true" && q.tfOrFibKey !== "false") {
            throw new Error(`Soal TF exercise ${mat.sequence}.${sub.sequence} #${q.sequence} kunci invalid`);
          }
        } else if (q.questionType === "FIB") {
          const norm = normalizeFib(q.tfOrFibKey);
          if (!norm || q.tfOrFibKey.length > 255) {
            throw new Error(`Soal FIB exercise ${mat.sequence}.${sub.sequence} #${q.sequence} kunci invalid`);
          }
        }
      }
    }
  }

  if (subCount !== 20 || exCount !== 20 || qCount !== 33 || optCount !== 56) {
    throw new Error(
      `Ringkasan Exercise tidak sesuai: sub=${subCount}, ex=${exCount}, q=${qCount}, opt=${optCount}`
    );
  }
  if (typeCounts.MC !== 14 || typeCounts.TF !== 9 || typeCounts.FIB !== 10) {
    throw new Error(`Distribusi tipe exercise salah: ${JSON.stringify(typeCounts)}`);
  }

  for (const testType of ["PRE", "POST"]) {
    const qs = testBank[testType];
    if (qs.length !== 20) {
      throw new Error(`${testType} harus 20 soal, ditemukan ${qs.length}`);
    }
    for (const q of qs) {
      if (q.questionType === "MC") {
        if (q.options.length !== 4 || !q.correctLetter) {
          throw new Error(`Soal MC ${testType} #${q.sequence} tidak valid`);
        }
      } else if (q.questionType === "TF") {
        if (q.tfOrFibKey !== "true" && q.tfOrFibKey !== "false") {
          throw new Error(`Soal TF ${testType} #${q.sequence} kunci invalid`);
        }
      } else if (q.questionType === "FIB") {
        const norm = normalizeFib(q.tfOrFibKey);
        if (!norm || q.tfOrFibKey.length > 255) {
          throw new Error(`Soal FIB ${testType} #${q.sequence} kunci invalid`);
        }
      }
    }
  }
}

function buildSql(materials, testBank) {
  const lines = [];
  lines.push(
    "-- ============================================================================",
    "-- 007_seed_official_content.sql — Seed Resmi Konten, Exercise, & Pre/Post-Test",
    "-- Dihasilkan deterministik oleh scripts/generate-seed.mjs (JANGAN EDIT MANUAL)",
    "-- Kontrak P3/P5: soal MC di-insert dalam satu transaksi dengan UUID opsi pre-generated.",
    "-- ============================================================================",
    "",
    "BEGIN;",
    ""
  );

  // 1. Materials, SubMaterials, Exercises, Questions, Options
  for (const mat of materials) {
    const materialId = deterministicUuid(`material:${mat.sequence}`);
    lines.push(
      `INSERT INTO public.material (material_id, title, description, sequence)`,
      `VALUES (${sqlString(materialId)}, ${sqlString(mat.title)}, ${sqlString(mat.description)}, ${mat.sequence})`,
      `ON CONFLICT (sequence) DO NOTHING;`,
      ""
    );

    for (const sub of mat.submaterials) {
      const submaterialId = deterministicUuid(`sub_material:${mat.sequence}.${sub.sequence}`);
      const exerciseId = deterministicUuid(`exercise:${mat.sequence}.${sub.sequence}`);

      lines.push(
        `INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)`,
        `VALUES (${sqlString(submaterialId)}, ${sqlString(materialId)}, ${sqlString(sub.title)}, ${sqlString(sub.contentMarkdown)}, ${sub.sequence})`,
        `ON CONFLICT (material_id, sequence) DO NOTHING;`,
        "",
        `INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)`,
        `VALUES (${sqlString(exerciseId)}, ${sqlString(submaterialId)}, ${sqlString(sub.exercise.title)}, ${sqlString(sub.exercise.questionType)})`,
        `ON CONFLICT (submaterial_id) DO NOTHING;`,
        ""
      );

      for (const q of sub.exercise.questions) {
        const qId = deterministicUuid(
          `exercise_question:${mat.sequence}.${sub.sequence}:${q.sequence}`
        );

        let correctOptId = "NULL";
        let correctBool = "NULL";
        let correctText = "NULL";
        const optRows = [];

        if (q.questionType === "MC") {
          for (const opt of q.options) {
            const optId = deterministicUuid(
              `exercise_option:${mat.sequence}.${sub.sequence}:${q.sequence}:${opt.sequence}`
            );
            if (opt.letter === q.correctLetter) {
              correctOptId = sqlString(optId);
            }
            optRows.push({ ...opt, optId });
          }
        } else if (q.questionType === "TF") {
          correctBool = q.tfOrFibKey === "true" ? "TRUE" : "FALSE";
        } else {
          correctText = sqlString(q.tfOrFibKey);
        }

        lines.push(
          `INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)`,
          `VALUES (${sqlString(qId)}, ${sqlString(exerciseId)}, ${sqlString(q.questionText)}, ${sqlString(q.questionType)}, ${correctOptId}, ${correctBool}, ${correctText}, ${sqlString(q.explanation)}, ${sqlString(q.hint)}, ${q.sequence})`,
          `ON CONFLICT (exercise_id, sequence) DO NOTHING;`
        );

        for (const opt of optRows) {
          lines.push(
            `INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)`,
            `VALUES (${sqlString(opt.optId)}, ${sqlString(qId)}, ${sqlString(opt.text)}, ${opt.sequence})`,
            `ON CONFLICT (exercise_question_id, sequence) DO NOTHING;`
          );
        }
        lines.push("");
      }
    }
  }

  // 2. Tests (PRE & POST)
  const testMeta = {
    PRE: {
      title: "Pre-Test PLAS-TypeScript",
      description:
        "Evaluasi kemampuan awal mahasiswa sebelum mempelajari 7 materi TypeScript.",
    },
    POST: {
      title: "Post-Test PLAS-TypeScript",
      description:
        "Evaluasi akhir mahasiswa setelah menyelesaikan seluruh materi dan latihan wajib (DBR-15).",
    },
  };

  for (const testType of ["PRE", "POST"]) {
    const testId = deterministicUuid(`test:${testType}`);
    lines.push(
      `INSERT INTO public.test (test_id, title, test_type, description)`,
      `VALUES (${sqlString(testId)}, ${sqlString(testMeta[testType].title)}, ${sqlString(testType)}, ${sqlString(testMeta[testType].description)})`,
      `ON CONFLICT (test_type) DO NOTHING;`,
      ""
    );

    for (const q of testBank[testType]) {
      const qId = deterministicUuid(`test_question:${testType}:${q.sequence}`);
      let correctOptId = "NULL";
      let correctBool = "NULL";
      let correctText = "NULL";
      const optRows = [];

      if (q.questionType === "MC") {
        for (const opt of q.options) {
          const optId = deterministicUuid(
            `test_option:${testType}:${q.sequence}:${opt.sequence}`
          );
          if (opt.letter === q.correctLetter) {
            correctOptId = sqlString(optId);
          }
          optRows.push({ ...opt, optId });
        }
      } else if (q.questionType === "TF") {
        correctBool = q.tfOrFibKey === "true" ? "TRUE" : "FALSE";
      } else {
        correctText = sqlString(q.tfOrFibKey);
      }

      lines.push(
        `INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)`,
        `VALUES (${sqlString(qId)}, ${sqlString(testId)}, ${sqlString(q.questionType)}, ${sqlString(q.questionText)}, ${correctOptId}, ${correctBool}, ${correctText}, ${q.sequence})`,
        `ON CONFLICT (test_id, sequence) DO NOTHING;`
      );

      for (const opt of optRows) {
        lines.push(
          `INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)`,
          `VALUES (${sqlString(opt.optId)}, ${sqlString(qId)}, ${sqlString(opt.text)}, ${opt.sequence})`,
          `ON CONFLICT (test_question_id, sequence) DO NOTHING;`
        );
      }
      lines.push("");
    }
  }

  lines.push("COMMIT;", "");
  return lines.join("\n");
}

function main() {
  const contentMd = fs.readFileSync(CONTENT_FILE, "utf8");
  const testMd = fs.readFileSync(TEST_BANK_FILE, "utf8");

  const materials = parseMaterialsAndExercises(contentMd);
  const testBank = parseTestBank(testMd);
  validateParsed(materials, testBank);

  const sql = buildSql(materials, testBank);
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, sql, "utf8");

  console.log(
    `Generated ${path.relative(ROOT_DIR, OUTPUT_FILE)}: 7 materials, 20 sub_materials, 20 exercises (33 questions, 56 options), 2 tests (20 PRE + 20 POST).`
  );
}

main();
