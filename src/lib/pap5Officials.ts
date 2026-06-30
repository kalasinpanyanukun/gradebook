import { LEARNING_AREAS } from "./learningAreas";
import { supabase } from "./supabase";
import type { AppData, Profile } from "../types";
import { getErrorMessage, isSchemaCacheErrorFor } from "./dbErrors";
import { isoDateToDisplay, isWithinEntryWindow } from "./thaiDate";

export { LEARNING_AREAS, isWithinEntryWindow };
export const formatThaiDateForDisplay = isoDateToDisplay;

export const PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE =
  "ฐานข้อมูลยังไม่มีตารางตั้งค่าผู้ลงนาม ปพ.5 กรุณารัน migration `supabase/migrations/0025_school_pap5_officials.sql` ใน Supabase SQL Editor";

export const PAP5_OFFICIALS_MIGRATION_HINT = PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE;

export const SCHOOL_CLASSROOM_TEACHERS: Record<string, string[]> = {};

type TeacherProfile = Pick<Profile, "id" | "title" | "full_name">;

export type Pap5OfficialsSettings = {
  learningAreaHeads: Record<string, string | null>;
  headOfEvaluationId: string | null;
  deputyDirectorId: string | null;
};

export type Pap5OfficialNames = {
  headOfLearningArea: string;
  headOfEvaluation: string;
  deputyDirector: string;
};

type Pap5OfficialNamesRow = {
  head_of_learning_area: string | null;
  head_of_evaluation: string | null;
  deputy_director: string | null;
};

const KALASIN_PANYANUKUL_SCHOOL_NAME_PART = "กาฬสินธุ์ปัญญานุกูล";
const KALASIN_DEFAULT_HEAD_OF_EVALUATION = "นางสาว ประภาวดี ศรีทับ";
const KALASIN_DEFAULT_DEPUTY_DIRECTOR = "นางสาว อัจฉราภรณ์ เศษวิ";

const KALASIN_DEFAULT_LEARNING_AREA_HEADS: Record<string, string> = {
  ภาษาไทย: "นางสาว พรชิดา ภูแสงสั่น",
  คณิตศาสตร์: "นางสาว ราตรี ภูจอมแก้ว",
  วิทยาศาสตร์และเทคโนโลยี: "นางสาว พิยา คำปัน",
  "สังคมศึกษา ศาสนา และวัฒนธรรม": "นางสาว ประภาวดี ศรีทับ",
  สุขศึกษาและพลศึกษา: "นาย ทนงเดช วงษ์ประจันต์",
  ศิลปะ: "นาย วสันต์ วอแพง",
  ภาษาต่างประเทศ: "นางสาว พรนิมา สว่างศรี",
  การงานอาชีพ: "นาง ฐิติมา สุ้มเกษตร",
};

function blankLearningAreaHeads(): Record<string, string | null> {
  return Object.fromEntries(LEARNING_AREAS.map((area) => [area, null]));
}

function normalizeLearningArea(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function resolveLearningAreaHeadId(
  settings: Pap5OfficialsSettings,
  learningArea: string,
): string | null {
  const exactMatch = settings.learningAreaHeads[learningArea];
  if (exactMatch !== undefined) return exactMatch;

  const normalizedTarget = normalizeLearningArea(learningArea);
  const matchedEntry = Object.entries(settings.learningAreaHeads).find(
    ([area]) => normalizeLearningArea(area) === normalizedTarget,
  );
  return matchedEntry?.[1] ?? null;
}

function resolveDefaultLearningAreaHead(learningArea: string): string {
  const normalizedTarget = normalizeLearningArea(learningArea);
  const matchedEntry = Object.entries(KALASIN_DEFAULT_LEARNING_AREA_HEADS).find(
    ([area]) => normalizeLearningArea(area) === normalizedTarget,
  );
  return matchedEntry?.[1] ?? "";
}

function shouldUseKalasinDefaults(generalInfo: AppData["generalInfo"]): boolean {
  return !generalInfo.schoolName || generalInfo.schoolName.includes(KALASIN_PANYANUKUL_SCHOOL_NAME_PART);
}

function defaultOfficialNames(
  learningArea: string,
  generalInfo: AppData["generalInfo"],
): Pap5OfficialNames {
  if (!shouldUseKalasinDefaults(generalInfo)) {
    return {
      headOfLearningArea: "",
      headOfEvaluation: "",
      deputyDirector: "",
    };
  }

  return {
    headOfLearningArea: resolveDefaultLearningAreaHead(learningArea),
    headOfEvaluation: KALASIN_DEFAULT_HEAD_OF_EVALUATION,
    deputyDirector: KALASIN_DEFAULT_DEPUTY_DIRECTOR,
  };
}

export function teacherDisplayName(profile: Pick<Profile, "title" | "full_name"> | null | undefined): string {
  if (!profile) return "";
  return [profile.title, profile.full_name].filter(Boolean).join(" ");
}

function findTeacherId(profiles: TeacherProfile[], ...keywords: string[]): string | null {
  const normalizedKeywords = keywords
    .map((keyword) => keyword.replace(/\s+/g, "").toLowerCase())
    .filter(Boolean);

  if (normalizedKeywords.length === 0) return null;

  for (const profile of profiles) {
    const displayName = teacherDisplayName(profile).replace(/\s+/g, "").toLowerCase();
    const fullName = profile.full_name.replace(/\s+/g, "").toLowerCase();
    const haystack = `${displayName}|${fullName}`;
    if (normalizedKeywords.every((keyword) => haystack.includes(keyword))) {
      return profile.id;
    }
  }

  return null;
}

export function buildDefaultPap5Officials(profiles: TeacherProfile[]): Pap5OfficialsSettings {
  return {
    learningAreaHeads: blankLearningAreaHeads(),
    headOfEvaluationId: findTeacherId(profiles, "ประภาวดี", "ศรีทับ"),
    deputyDirectorId: findTeacherId(profiles, "อัจฉราภรณ์", "เศษวิ"),
  };
}

function isPap5SchemaError(error: unknown): boolean {
  return (
    isSchemaCacheErrorFor(error, "school_pap5_officials") ||
    isSchemaCacheErrorFor(error, "school_learning_area_heads")
  );
}

function isMissingOfficialNamesRpc(error: unknown): boolean {
  return isSchemaCacheErrorFor(error, "get_pap5_official_names");
}

function isMissingOfficialsSyncRpc(error: unknown): boolean {
  return isSchemaCacheErrorFor(error, "sync_pap5_official_names_to_gradebooks");
}

async function fetchProfileNames(profileIds: Array<string | null | undefined>): Promise<Map<string, string>> {
  const ids = Array.from(new Set(profileIds.filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, title, full_name")
    .in("id", ids);

  if (error) throw error;

  return new Map(
    ((data ?? []) as TeacherProfile[]).map((profile) => [profile.id, teacherDisplayName(profile)]),
  );
}

export async function loadPap5Officials(schoolId: string): Promise<Pap5OfficialsSettings> {
  const [officialsResult, learningAreaHeadsResult] = await Promise.all([
    supabase
      .from("school_pap5_officials")
      .select("head_of_evaluation_id, deputy_director_id")
      .eq("school_id", schoolId)
      .maybeSingle(),
    supabase
      .from("school_learning_area_heads")
      .select("learning_area, teacher_id")
      .eq("school_id", schoolId),
  ]);

  if (officialsResult.error) {
    throw isPap5SchemaError(officialsResult.error)
      ? new Error(PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE)
      : officialsResult.error;
  }
  if (learningAreaHeadsResult.error) {
    throw isPap5SchemaError(learningAreaHeadsResult.error)
      ? new Error(PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE)
      : learningAreaHeadsResult.error;
  }

  const learningAreaHeads = blankLearningAreaHeads();
  for (const row of (learningAreaHeadsResult.data ?? []) as Array<{ learning_area: string | null; teacher_id: string | null }>) {
    if (typeof row.learning_area === "string") {
      learningAreaHeads[row.learning_area] = row.teacher_id ?? null;
    }
  }

  return {
    learningAreaHeads,
    headOfEvaluationId: officialsResult.data?.head_of_evaluation_id ?? null,
    deputyDirectorId: officialsResult.data?.deputy_director_id ?? null,
  };
}

export async function savePap5Officials(
  schoolId: string,
  settings: Pap5OfficialsSettings,
): Promise<number> {
  const updatedAt = new Date().toISOString();

  const { error: officialsError } = await supabase
    .from("school_pap5_officials")
    .upsert(
      {
        school_id: schoolId,
        head_of_evaluation_id: settings.headOfEvaluationId,
        deputy_director_id: settings.deputyDirectorId,
        updated_at: updatedAt,
      },
      { onConflict: "school_id" },
    );

  if (officialsError) {
    throw isPap5SchemaError(officialsError)
      ? new Error(PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE)
      : officialsError;
  }

  const rows = LEARNING_AREAS.map((learningArea) => ({
    school_id: schoolId,
    learning_area: learningArea,
    teacher_id: settings.learningAreaHeads[learningArea] ?? null,
    updated_at: updatedAt,
  }));

  const { error: headsError } = await supabase
    .from("school_learning_area_heads")
    .upsert(rows, { onConflict: "school_id,learning_area" });

  if (headsError) {
    throw isPap5SchemaError(headsError)
      ? new Error(PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE)
      : headsError;
  }

  const { data: syncCount, error: syncError } = await supabase.rpc(
    "sync_pap5_official_names_to_gradebooks",
    { p_school_id: schoolId },
  );

  if (syncError && !isMissingOfficialsSyncRpc(syncError)) {
    throw syncError;
  }

  return typeof syncCount === "number" ? syncCount : 0;
}

async function loadPap5OfficialNames(
  schoolId: string,
  learningArea: string,
): Promise<Pap5OfficialNames> {
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("get_pap5_official_names", {
      p_school_id: schoolId,
      p_learning_area: learningArea,
    })
    .maybeSingle();

  if (!rpcError) {
    const row = rpcData as Pap5OfficialNamesRow | null;
    return {
      headOfLearningArea: row?.head_of_learning_area ?? "",
      headOfEvaluation: row?.head_of_evaluation ?? "",
      deputyDirector: row?.deputy_director ?? "",
    };
  }

  if (!isMissingOfficialNamesRpc(rpcError)) {
    throw rpcError;
  }

  const settings = await loadPap5Officials(schoolId);
  const headOfLearningAreaId = resolveLearningAreaHeadId(settings, learningArea);
  const profileNames = await fetchProfileNames([
    headOfLearningAreaId,
    settings.headOfEvaluationId,
    settings.deputyDirectorId,
  ]);

  return {
    headOfLearningArea: profileNames.get(headOfLearningAreaId ?? "") ?? "",
    headOfEvaluation: profileNames.get(settings.headOfEvaluationId ?? "") ?? "",
    deputyDirector: profileNames.get(settings.deputyDirectorId ?? "") ?? "",
  };
}

function mergeOfficials(
  generalInfo: AppData["generalInfo"],
  officialNames: Pap5OfficialNames,
  learningArea: string,
): AppData["generalInfo"] {
  const defaults = defaultOfficialNames(learningArea, generalInfo);

  return {
    ...generalInfo,
    headOfLearningArea:
      officialNames.headOfLearningArea || generalInfo.headOfLearningArea || defaults.headOfLearningArea,
    headOfEvaluation:
      officialNames.headOfEvaluation || generalInfo.headOfEvaluation || defaults.headOfEvaluation,
    deputyDirector:
      officialNames.deputyDirector || generalInfo.deputyDirector || defaults.deputyDirector,
  };
}

export function applyPap5OfficialDisplayDefaults(
  generalInfo: AppData["generalInfo"],
): AppData["generalInfo"] {
  return mergeOfficials(
    generalInfo,
    {
      headOfLearningArea: "",
      headOfEvaluation: "",
      deputyDirector: "",
    },
    generalInfo.learningArea,
  );
}

export async function mergePap5OfficialsIntoGeneralInfo(
  schoolId: string,
  learningArea: string,
  generalInfo: AppData["generalInfo"],
): Promise<AppData["generalInfo"]> {
  try {
    const officialNames = await loadPap5OfficialNames(schoolId, learningArea);
    return mergeOfficials(generalInfo, officialNames, learningArea);
  } catch (error) {
    if (getErrorMessage(error, "") === PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE) {
      return mergeOfficials(generalInfo, {
        headOfLearningArea: "",
        headOfEvaluation: "",
        deputyDirector: "",
      }, learningArea);
    }
    throw error;
  }
}
