import type { AppData } from "../types";

export interface GradebookRow {
  general_info?: AppData["generalInfo"];
  students?: AppData["students"];
  attendance?: AppData["attendance"];
  scores?: AppData["scores"];
  score_config?: AppData["scoreConfig"] | null;
  attributes?: AppData["attributes"];
  analytical?: AppData["analytical"];
  indicators?: AppData["indicators"];
}

const DEFAULT_GENERAL_INFO: AppData["generalInfo"] = {
  schoolName: "โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์",
  agencyName: "สำนักบริหารงานการศึกษาพิเศษ",
  logoUrl: "/logo3.png",
  gradeLevel: "",
  semester: "1",
  academicYear: "",
  subjectCode: "",
  subjectName: "",
  learningArea: "",
  totalHours: "1",
  hoursPerWeek: "1",
  hoursPerSemester: "20",
  teacherName: "",
  teacherName2: "",
  homeroomTeacher1: "",
  homeroomTeacher2: "",
  homeroomTeacher3: "",
  homeroomTeachers: "",
  headOfLearningArea: "",
  headOfEvaluation: "",
  deputyDirector: "",
  schoolDirector: "",
  approvalDate: new Date().toISOString().split("T")[0],
};

export function normalizeGeneralInfo(
  generalInfo?: Partial<AppData["generalInfo"]>,
): AppData["generalInfo"] {
  return {
    ...DEFAULT_GENERAL_INFO,
    ...(generalInfo ?? {}),
  };
}

export function rowToAppData(row: GradebookRow): AppData {
  return {
    generalInfo: normalizeGeneralInfo(row.general_info),
    students: row.students ?? [],
    attendance: row.attendance ?? {},
    scores: row.scores ?? {},
    scoreConfig: row.score_config ?? undefined,
    attributes: row.attributes ?? {},
    analytical: row.analytical ?? {},
    indicators: row.indicators ?? [],
  };
}

export function appDataToRow(d: AppData) {
  return {
    general_info: d.generalInfo,
    students: d.students,
    attendance: d.attendance,
    scores: d.scores,
    score_config: d.scoreConfig ?? null,
    attributes: d.attributes,
    analytical: d.analytical,
    indicators: d.indicators,
  };
}
