import { LEARNING_AREAS } from "./learningAreas";
import { supabase } from "./supabase";
import type { AppData, Profile } from "../types";
import { getErrorMessage, isSchemaCacheErrorFor } from "./dbErrors";
import { isoDateToDisplay, isWithinEntryWindow } from "./thaiDate";

export { LEARNING_AREAS, isWithinEntryWindow };
export const formatThaiDateForDisplay = isoDateToDisplay;

export const PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE =
  "ฐานข้อมูลยังไม่มีตารางตั้งค่าผู้ลงนาม ปพ.5 กรุณารัน migration `supabase/migrations/0025_school_pap5_officials.sql` ใน Supabase SQL Editor";

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

function blankLearningAreaHeads(): Record<string, string | null> {
  return Object.fromEntries(LEARNING_AREAS.map((area) => [area, null]));
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
): Promise<void> {
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
}

async function loadPap5OfficialNames(
  schoolId: string,
  learningArea: string,
): Promise<Pap5OfficialNames> {
  const settings = await loadPap5Officials(schoolId);
  const profileNames = await fetchProfileNames([
    settings.learningAreaHeads[learningArea] ?? null,
    settings.headOfEvaluationId,
    settings.deputyDirectorId,
  ]);

  return {
    headOfLearningArea: profileNames.get(settings.learningAreaHeads[learningArea] ?? "") ?? "",
    headOfEvaluation: profileNames.get(settings.headOfEvaluationId ?? "") ?? "",
    deputyDirector: profileNames.get(settings.deputyDirectorId ?? "") ?? "",
  };
}

function mergeOfficials(
  generalInfo: AppData["generalInfo"],
  officialNames: Pap5OfficialNames,
): AppData["generalInfo"] {
  return {
    ...generalInfo,
    headOfLearningArea: officialNames.headOfLearningArea,
    headOfEvaluation: officialNames.headOfEvaluation,
    deputyDirector: officialNames.deputyDirector,
  };
}

export async function mergePap5OfficialsIntoGeneralInfo(
  schoolId: string,
  learningArea: string,
  generalInfo: AppData["generalInfo"],
): Promise<AppData["generalInfo"]> {
  try {
    const officialNames = await loadPap5OfficialNames(schoolId, learningArea);
    return mergeOfficials(generalInfo, officialNames);
  } catch (error) {
    if (getErrorMessage(error, "") === PAP5_OFFICIALS_MISSING_SCHEMA_MESSAGE) {
      return mergeOfficials(generalInfo, {
        headOfLearningArea: "",
        headOfEvaluation: "",
        deputyDirector: "",
      });
    }
    throw error;
  }
}
