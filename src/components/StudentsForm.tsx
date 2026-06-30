import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AppData, Student } from "../types";
import { AlertTriangle, Check, Pencil, X, Upload, Download, Trash2, Plus } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const STUDENT_NO_WIDTH = 48;
const STUDENT_CODE_WIDTH = 128;
const CITIZEN_ID_WIDTH = 180;
const STUDENT_NAME_WIDTH = 292;
const WEEK_LABEL_WIDTH = 64;
const DAY_CELL_WIDTH = 24;
const SUMMARY_CELL_WIDTH = 72;
const RESULT_CELL_WIDTH = 84;
const STUDENT_CODE_LEFT = STUDENT_NO_WIDTH;
const CITIZEN_ID_LEFT = STUDENT_NO_WIDTH + STUDENT_CODE_WIDTH;
const STUDENT_NAME_LEFT = CITIZEN_ID_LEFT + CITIZEN_ID_WIDTH;
const WEEK_LABEL_LEFT = STUDENT_NAME_LEFT + STUDENT_NAME_WIDTH;

function defaultStudyPeriod(generalInfo: AppData["generalInfo"]) {
  const yearStr =
    generalInfo.academicYear || new Date().getFullYear().toString();
  const yearNum = parseInt(yearStr);
  const gregorianYear = yearNum > 2500 ? yearNum - 543 : yearNum;

  if (generalInfo.semester === "2") {
    return {
      startDate: `${gregorianYear}-10-16`,
      endDate: `${gregorianYear + 1}-03-31`,
    };
  }

  return {
    startDate: `${gregorianYear}-05-16`,
    endDate: `${gregorianYear}-09-30`,
  };
}

function formatThaiDateText(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `วันที่ ${day} ${THAI_MONTHS_FULL[month - 1]} พ.ศ.${year + 543}`;
}

function formatThaiStudyPeriod(startDate: string, endDate: string) {
  const start = formatThaiDateText(startDate);
  const end = formatThaiDateText(endDate);
  if (start && end) return `${start} ถึง ${end}`;
  return start || end || "";
}

function fixedWidthStyle(width: number, left?: number): React.CSSProperties {
  return {
    ...(typeof left === "number" ? { left: `${left}px` } : {}),
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
  };
}

interface Props {
  data: AppData["students"];
  generalInfo: AppData["generalInfo"];
  attendance?: AppData["attendance"];
  rosterLocked?: boolean;
  onChange: (data: AppData["students"]) => void;
  onAttendanceChange?: (attendance: AppData["attendance"]) => void;
  onPersistStudentEdit?: (student: Student, previousStudent?: Student) => Promise<void>;
}

export const StudentsForm: React.FC<Props> = ({
  data,
  generalInfo,
  attendance,
  rosterLocked = false,
  onChange,
  onAttendanceChange,
  onPersistStudentEdit,
}) => {
  const [editModalMode, setEditModalMode] = useState<
    "students" | "attendance" | null
  >(null);
  const [studentMode, setStudentMode] = useState<"single" | "multiple">(
    "single",
  );
  const [newStudent, setNewStudent] = useState({
    number: "",
    studentId: "",
    citizenId: "",
    name: "",
  });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentDraft, setStudentDraft] = useState({
    studentId: "",
    citizenId: "",
    name: "",
    targetPercentage: 100,
  });
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState(1);
  const [schedule, setSchedule] = useState([{ dayOfWeek: 1, hours: 1 }]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "danger" | "warning";
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    tone: "danger",
    onConfirm: () => {},
  });

  const currentHoursPerWeek = parseInt(generalInfo.totalHours) || 1;
  const currentTotalHours = currentHoursPerWeek * 20;
  const fallbackStudyPeriod = useMemo(
    () => defaultStudyPeriod(generalInfo),
    [generalInfo.academicYear, generalInfo.semester],
  );
  const effectiveStudyStartDate =
    generalInfo.studyStartDate ||
    attendance?.settings?.startDate ||
    fallbackStudyPeriod.startDate;
  const effectiveStudyEndDate =
    generalInfo.studyEndDate ||
    attendance?.settings?.endDate ||
    fallbackStudyPeriod.endDate;
  const studyPeriodText = formatThaiStudyPeriod(
    effectiveStudyStartDate,
    effectiveStudyEndDate,
  );

  useEffect(() => {
    if (editModalMode === "attendance") {
      if (attendance?.settings) {
        let savedDaysPerWeek = attendance.settings.daysPerWeek || 1;
        let savedSchedule = attendance.settings.schedule || [
          { dayOfWeek: 1, hours: 1 },
        ];

        // Ensure daysPerWeek doesn't exceed currentHoursPerWeek
        if (savedDaysPerWeek > currentHoursPerWeek) {
          savedDaysPerWeek = currentHoursPerWeek;
          savedSchedule = savedSchedule.slice(0, savedDaysPerWeek);
        }

        // Ensure total hours match currentHoursPerWeek
        const sumHours = savedSchedule.reduce(
          (acc, curr) => acc + curr.hours,
          0,
        );

        // Remove duplicate days
        const uniqueDays = new Set();
        savedSchedule = savedSchedule.filter((s) => {
          if (uniqueDays.has(s.dayOfWeek)) return false;
          uniqueDays.add(s.dayOfWeek);
          return true;
        });

        // If we removed duplicates, we might need to add new days
        while (savedSchedule.length < savedDaysPerWeek) {
          let nextDay = 1;
          while (uniqueDays.has(nextDay) && nextDay <= 5) nextDay++;
          if (nextDay > 5) nextDay = 1;
          savedSchedule.push({ dayOfWeek: nextDay, hours: 1 });
          uniqueDays.add(nextDay);
        }

        if (
          sumHours !== currentHoursPerWeek ||
          savedSchedule.length !== savedDaysPerWeek
        ) {
          savedSchedule = savedSchedule.map((s) => ({ ...s }));
          // Reset hours to distribute currentHoursPerWeek
          for (let i = 0; i < savedSchedule.length - 1; i++) {
            savedSchedule[i].hours = 1;
          }
          const sumOthers = savedSchedule
            .slice(0, -1)
            .reduce((acc, curr) => acc + curr.hours, 0);
          savedSchedule[savedSchedule.length - 1].hours = Math.max(
            1,
            currentHoursPerWeek - sumOthers,
          );
        }

        setDaysPerWeek(savedDaysPerWeek);
        setSchedule(savedSchedule);
        setStartDate(effectiveStudyStartDate);
        setEndDate(effectiveStudyEndDate);
      }

      if (!attendance?.settings) {
        setStartDate(effectiveStudyStartDate);
        setEndDate(effectiveStudyEndDate);
      }
    }
  }, [
    editModalMode,
    attendance?.settings,
    generalInfo.semester,
    generalInfo.academicYear,
    generalInfo.studyStartDate,
    generalInfo.studyEndDate,
    effectiveStudyStartDate,
    effectiveStudyEndDate,
  ]);

  const getHoursFromText = (text: string) => {
    if (!text) return 0;
    if (text.includes("-")) {
      const [start, end] = text.split("-").map(Number);
      return end - start + 1;
    }
    return 1;
  };

  let totalScheduledHours = 0;
  Object.values(attendance?.hoursMap || {}).forEach((text: any) => {
    totalScheduledHours += getHoursFromText(text);
  });
  const scheduledPercentage =
    currentTotalHours > 0
      ? ((totalScheduledHours / currentTotalHours) * 100).toFixed(2)
      : "0.00";

  const handleClearAttendance = () => {
    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการล้างเวลาเรียน",
      message:
        "คุณต้องการล้างข้อมูลเวลาเรียนทั้งหมดใช่หรือไม่? (ข้อมูลรายชื่อนักเรียนจะยังคงอยู่)",
      confirmLabel: "ยืนยันการล้าง",
      tone: "danger",
      onConfirm: () => {
        if (onAttendanceChange) {
          onAttendanceChange({
            ...attendance,
            hoursMap: {},
            records: {},
          });
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearStudents = () => {
    if (rosterLocked) return;

    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการล้างรายชื่อนักเรียน",
      message:
        "คุณต้องการลบรายชื่อนักเรียนทั้งหมดใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)",
      confirmLabel: "ยืนยันการลบ",
      tone: "danger",
      onConfirm: () => {
        onChange([]);
        if (onAttendanceChange) {
          onAttendanceChange({
            ...attendance,
            records: {},
          });
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAttendanceChange = (
    studentId: string,
    dateKey: string,
    value: string,
  ) => {
    if (onAttendanceChange) {
      const newRecords = { ...(attendance?.records || {}) };
      if (!newRecords[studentId]) newRecords[studentId] = {};
      newRecords[studentId][dateKey] = value;
      onAttendanceChange({ ...attendance, records: newRecords });
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");

    worksheet.columns = [
      { header: "เลขที่", key: "number", width: 10 },
      { header: "เลขประจำตัว", key: "studentId", width: 15 },
      { header: "เลขประจำตัวประชาชน", key: "citizenId", width: 20 },
      { header: "ชื่อ-สกุล", key: "name", width: 30 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "student_template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (rosterLocked) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) return;

    const newStudents: Student[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const studentId = row.getCell(2).value?.toString() || "";
      const citizenId = row.getCell(3).value?.toString() || "";
      const name = row.getCell(4).value?.toString() || "";

      if (name) {
        newStudents.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          studentId,
          citizenId,
          name,
        });
      }
    });

    onChange([...data, ...newStudents]);
  };

  const handleAddSingleStudent = () => {
    if (rosterLocked) return;

    if (newStudent.name) {
      const newId = Date.now().toString();
      onChange([
        ...data,
        {
          id: newId,
          studentId: newStudent.studentId,
          citizenId: newStudent.citizenId,
          name: newStudent.name,
        },
      ]);
      setNewStudent({ number: "", studentId: "", citizenId: "", name: "" });
    }
  };

  const handleAddStudentRow = () => {
    if (rosterLocked) return;

    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextStudent: Student = {
      id: newId,
      studentId: "",
      citizenId: "",
      name: "",
      targetPercentage: 100,
    };

    onChange([...data, nextStudent]);
    setEditingStudentId(newId);
    setStudentDraft({
      studentId: "",
      citizenId: "",
      name: "",
      targetPercentage: 100,
    });
  };

  const beginEditStudent = (student: Student) => {
    if (rosterLocked) return;
    setEditingStudentId(student.id);
    setStudentDraft({
      studentId: student.studentId || "",
      citizenId: student.citizenId || "",
      name: student.name || "",
      targetPercentage: student.targetPercentage ?? 100,
    });
  };

  const hasAcademicStudentChanges = (current: Student, next: Student) => {
    return (
      (current.studentId || "").trim() !== (next.studentId || "").trim() ||
      (current.citizenId || "").trim() !== (next.citizenId || "").trim() ||
      (current.name || "").trim() !== (next.name || "").trim()
    );
  };

  const commitStudentDraft = async ({
    confirmed = false,
    closeModalAfterSave = false,
  }: { confirmed?: boolean; closeModalAfterSave?: boolean } = {}) => {
    if (!editingStudentId || rosterLocked) return true;

    const editingIndex = data.findIndex((student) => student.id === editingStudentId);
    if (editingIndex < 0) {
      setEditingStudentId(null);
      return true;
    }

    const updatedStudent: Student = {
      ...data[editingIndex],
      studentId: studentDraft.studentId,
      citizenId: studentDraft.citizenId,
      name: studentDraft.name,
      targetPercentage: studentDraft.targetPercentage,
    };

    if (!confirmed && hasAcademicStudentChanges(data[editingIndex], updatedStudent)) {
      setConfirmDialog({
        isOpen: true,
        title: "ยืนยันการอัปเดตข้อมูลนักเรียน",
        message:
          `ต้องการบันทึกการแก้ไขข้อมูลของ "${data[editingIndex].name || updatedStudent.name}" ใช่หรือไม่?\n\n` +
          "ระบบจะอัปเดตชื่อ รหัสนักเรียน หรือเลขประจำตัวประชาชนไปยังข้อมูลวิชาการและหน้าผู้ดูแลระบบด้วย",
        confirmLabel: "ยืนยันบันทึก",
        tone: "warning",
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          const saved = await commitStudentDraft({
            confirmed: true,
            closeModalAfterSave,
          });
          if (saved && closeModalAfterSave) {
            setEditModalMode(null);
          }
        },
      });
      return false;
    }

    setSavingStudentId(editingStudentId);
    try {
      await onPersistStudentEdit?.(updatedStudent, data[editingIndex]);
      onChange(data.map((student, index) => (index === editingIndex ? updatedStudent : student)));
      setEditingStudentId(null);
      if (closeModalAfterSave) {
        setEditModalMode(null);
      }
      return true;
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "ไม่สามารถบันทึกข้อมูลนักเรียนไปยังข้อมูลวิชาการได้",
      );
      return false;
    } finally {
      setSavingStudentId(null);
    }
  };

  const saveStudentDraft = () => {
    void commitStudentDraft();
  };

  const handleSaveStudentsModal = async () => {
    if (editingStudentId && !rosterLocked) {
      const saved = await commitStudentDraft({ closeModalAfterSave: true });
      if (!saved) return;
    }
    setEditModalMode(null);
  };

  const deleteStudent = (studentId: string, studentIndex: number) => {
    if (rosterLocked) return;
    const targetId = data[studentIndex]?.id || studentId;
    onChange(
      data.filter((student, index) => {
        if (index === studentIndex) return false;
        return targetId ? student.id !== targetId : true;
      }),
    );
    if (onAttendanceChange) {
      const nextRecords = { ...(attendance?.records || {}) };
      if (targetId) delete nextRecords[targetId];
      onAttendanceChange({
        ...attendance,
        records: nextRecords,
      });
    }
    if (editingStudentId === targetId) {
      setEditingStudentId(null);
    }
  };

  const handleGenerateAttendance = () => {
    const currentStudents = [...data];

    const parseDate = (dateString: string) => {
      if (!dateString) return new Date(0);
      const [y, m, d] = dateString.split("-");
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const totalHoursNeeded = currentHoursPerWeek * 20;

    let currentHour = 1;
    const newHoursMap: Record<string, string> = {};
    const newRecords: Record<string, Record<string, string>> = {};

    currentStudents.forEach((student) => {
      newRecords[student.id] = {};
    });

    if (startDate && endDate) {
      const validDates = dates.filter((date) => {
        const monthStr = String(date.getMonth() + 1).padStart(2, "0");
        const dayStr = String(date.getDate()).padStart(2, "0");
        const dateKey = `${monthStr}-${dayStr}`;
        return (
          date.getTime() >= start.getTime() &&
          date.getTime() <= end.getTime() &&
          !holidays[dateKey]
        );
      });

      let lastAssignedIndex = -1;
      const scheduleDays: { dateKey: string; hours: number }[] = [];

      for (let i = 0; i < validDates.length; i++) {
        if (currentHour > totalHoursNeeded) break;

        const date = validDates[i];
        const monthStr = String(date.getMonth() + 1).padStart(2, "0");
        const dayStr = String(date.getDate()).padStart(2, "0");
        const dateKey = `${monthStr}-${dayStr}`;

        const dayOfWeek = date.getDay();
        const scheduleItem = schedule.find((s) => s.dayOfWeek === dayOfWeek);

        if (scheduleItem) {
          const hoursForDay = scheduleItem.hours;
          const endHour = Math.min(
            currentHour + hoursForDay - 1,
            totalHoursNeeded,
          );

          if (currentHour === endHour) {
            newHoursMap[dateKey] = `${currentHour}`;
          } else {
            newHoursMap[dateKey] = `${currentHour}-${endHour}`;
          }
          scheduleDays.push({ dateKey, hours: endHour - currentHour + 1 });
          currentHour = endHour + 1;
          lastAssignedIndex = i;
        }
      }

      // Second pass: If we still need hours, fill the next available valid dates
      if (currentHour <= totalHoursNeeded && lastAssignedIndex !== -1) {
        for (let i = lastAssignedIndex + 1; i < validDates.length; i++) {
          if (currentHour > totalHoursNeeded) break;

          const date = validDates[i];
          const monthStr = String(date.getMonth() + 1).padStart(2, "0");
          const dayStr = String(date.getDate()).padStart(2, "0");
          const dateKey = `${monthStr}-${dayStr}`;

          if (!newHoursMap[dateKey]) {
            newHoursMap[dateKey] = `${currentHour}`;
            scheduleDays.push({ dateKey, hours: 1 });
            currentHour++;
            lastAssignedIndex = i;
          }
        }
      }

      // Third pass: If STILL need hours (ran out of valid dates), dump to the last assigned date
      if (currentHour <= totalHoursNeeded && lastAssignedIndex !== -1) {
        const date = validDates[lastAssignedIndex];
        const monthStr = String(date.getMonth() + 1).padStart(2, "0");
        const dayStr = String(date.getDate()).padStart(2, "0");
        const lastAssignedDateKey = `${monthStr}-${dayStr}`;

        const existingHours = newHoursMap[lastAssignedDateKey];
        let addedHours = 0;
        if (existingHours) {
          const parts = existingHours.split("-");
          const startH = parts[0];
          newHoursMap[lastAssignedDateKey] = `${startH}-${totalHoursNeeded}`;
          addedHours = totalHoursNeeded - currentHour + 1;
          const day = scheduleDays.find(
            (d) => d.dateKey === lastAssignedDateKey,
          );
          if (day) day.hours += addedHours;
        } else {
          newHoursMap[lastAssignedDateKey] =
            `${currentHour}-${totalHoursNeeded}`;
          addedHours = totalHoursNeeded - currentHour + 1;
          scheduleDays.push({
            dateKey: lastAssignedDateKey,
            hours: addedHours,
          });
        }
      }

      // Assign attendance based on targetPercentage
      currentStudents.forEach((student) => {
        const targetPct = student.targetPercentage ?? 100;
        const targetHours = Math.round((totalHoursNeeded * targetPct) / 100);
        let accumulated = 0;

        for (const day of scheduleDays) {
          if (accumulated < targetHours) {
            newRecords[student.id][day.dateKey] = "/";
            accumulated += day.hours;
          }
        }
      });
    }

    if (onAttendanceChange) {
      onAttendanceChange({
        ...attendance,
        hoursMap: newHoursMap,
        records: newRecords,
        settings: {
          daysPerWeek,
          schedule,
          hoursPerWeek: currentHoursPerWeek,
          startDate,
          endDate,
        },
      });
    }

    setEditModalMode(null);
  };

  // Generate 20 weeks
  const weeks = Array.from({ length: 20 }, (_, i) => i + 1);

  const { dates, holidays, thaiMonths, thaiMonthsShort } = useMemo(() => {
    const academicYearStr = generalInfo.academicYear || "2568";
    const semester = generalInfo.semester || "1";
    const academicYear = parseInt(academicYearStr) - 543;

    let currentDate =
      semester === "1"
        ? new Date(academicYear, 4, 10)
        : new Date(academicYear, 9, 25);
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const calculatedDates: Date[] = [];
    for (let i = 0; i < 100; i++) {
      calculatedDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const calculatedHolidays: Record<string, string> = {
      "01-01": "วันขึ้นปีใหม่",
      "04-06": "วันจักรี",
      "04-13": "วันสงกรานต์",
      "04-14": "วันสงกรานต์",
      "04-15": "วันสงกรานต์",
      "05-01": "วันแรงงาน",
      "05-04": "วันฉัตรมงคล",
      "06-03": "วันเฉลิมฯ พระราชินี",
      "07-28": "วันเฉลิมฯ ร.10",
      "08-12": "วันแม่แห่งชาติ",
      "10-13": "วันคล้ายวันสวรรคต ร.9",
      "10-23": "วันปิยมหาราช",
      "12-05": "วันพ่อแห่งชาติ",
      "12-10": "วันรัฐธรรมนูญ",
      "12-31": "วันสิ้นปี",
    };

    return {
      dates: calculatedDates,
      holidays: calculatedHolidays,
      thaiMonths: [
        "มกราคม",
        "กุมภาพันธ์",
        "มีนาคม",
        "เมษายน",
        "พฤษภาคม",
        "มิถุนายน",
        "กรกฎาคม",
        "สิงหาคม",
        "กันยายน",
        "ตุลาคม",
        "พฤศจิกายน",
        "ธันวาคม",
      ],
      thaiMonthsShort: [
        "ม.ค.",
        "ก.พ.",
        "มี.ค.",
        "เม.ย.",
        "พ.ค.",
        "มิ.ย.",
        "ก.ค.",
        "ส.ค.",
        "ก.ย.",
        "ต.ค.",
        "พ.ย.",
        "ธ.ค.",
      ],
    };
  }, [generalInfo.academicYear, generalInfo.semester]);

  const confirmationDialogPortal = confirmDialog.isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[120] grid min-h-dvh place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="p-6">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                  confirmDialog.tone === "warning"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {confirmDialog.tone === "warning" ? (
                  <AlertTriangle size={24} />
                ) : (
                  <Trash2 size={24} />
                )}
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">
                {confirmDialog.title}
              </h3>
              <p className="whitespace-pre-line text-slate-600">
                {confirmDialog.message}
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog((prev) => ({
                    ...prev,
                    isOpen: false,
                  }))
                }
                className="rounded-lg px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void confirmDialog.onConfirm()}
                className={`rounded-lg px-4 py-2 font-medium text-white shadow-sm transition-colors ${
                  confirmDialog.tone === "warning"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirmDialog.confirmLabel ?? "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="w-full overflow-auto">
      <div
        className="w-full bg-white p-4 sm:p-6"
        style={{ fontFamily: "Sarabun" }}
      >
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold">
            บันทึกเวลาเรียน ชั้นมัธยมศึกษาปีที่ {generalInfo.gradeLevel}{" "}
            ภาคเรียนที่ {generalInfo.semester} ปีการศึกษา{" "}
            {generalInfo.academicYear}
          </h2>
          <h3 className="text-lg">
            รวมเวลาเรียน {generalInfo.totalHours} ชั่วโมง/สัปดาห์{" "}
            {generalInfo.hoursPerSemester} ชั่วโมงภาคเรียน
          </h3>
          {studyPeriodText && (
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {studyPeriodText}
            </p>
          )}
        </div>

        <div className="excel-scroll-area overflow-x-auto">
          <div className="excel-scroll-content">
          <table className="excel-table whitespace-nowrap relative" style={{ width: "max-content", minWidth: "max-content" }}>
            <thead>
              <tr>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky left-0 z-20"
                  style={fixedWidthStyle(STUDENT_NO_WIDTH)}
                >
                  เลขที่
                </th>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky z-20"
                  style={fixedWidthStyle(STUDENT_CODE_WIDTH, STUDENT_CODE_LEFT)}
                >
                  เลขประจำตัว
                </th>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky z-20"
                  style={fixedWidthStyle(CITIZEN_ID_WIDTH, CITIZEN_ID_LEFT)}
                >
                  เลขประจำตัวประชาชน
                </th>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky z-20"
                  style={fixedWidthStyle(STUDENT_NAME_WIDTH, STUDENT_NAME_LEFT)}
                >
                  ชื่อ - สกุล
                </th>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={fixedWidthStyle(WEEK_LABEL_WIDTH, WEEK_LABEL_LEFT)}
                >
                  สัปดาห์ที่
                </th>
                {weeks.map((w) => (
                  <th key={w} colSpan={5} className="bg-orange-excel">
                    {w}
                  </th>
                ))}
                <th colSpan={2} className="bg-orange-excel">
                  รวมเวลาเรียนตลอดปี
                </th>
                <th rowSpan={4} className="bg-orange-excel" style={fixedWidthStyle(RESULT_CELL_WIDTH)}>
                  สรุปผล
                  <br />
                  การประเมิน
                </th>
              </tr>
              <tr>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={fixedWidthStyle(WEEK_LABEL_WIDTH, WEEK_LABEL_LEFT)}
                >
                  เดือน
                </th>
                {weeks.map((w) => {
                  const weekDates = dates.slice((w - 1) * 5, w * 5);
                  if (weekDates.length === 0)
                    return (
                      <th
                        key={`month-${w}`}
                        colSpan={5}
                        className="bg-orange-excel text-[11.5px]"
                      ></th>
                    );
                  const startMonth = weekDates[0].getMonth();
                  const endMonth = weekDates[4].getMonth();
                  const monthText =
                    startMonth === endMonth
                      ? thaiMonths[startMonth]
                      : `${thaiMonthsShort[startMonth]} - ${thaiMonthsShort[endMonth]}`;
                  return (
                    <th
                      key={`month-${w}`}
                      colSpan={5}
                      className="bg-orange-excel text-[11.5px]"
                    >
                      {monthText}
                    </th>
                  );
                })}
                <th className="bg-orange-excel" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>ชั่วโมง</th>
                <th className="bg-orange-excel" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>มาเรียน%</th>
              </tr>
              <tr>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={fixedWidthStyle(WEEK_LABEL_WIDTH, WEEK_LABEL_LEFT)}
                >
                  วันที่
                </th>
                {weeks.map((w) => {
                  const weekDates = dates.slice((w - 1) * 5, w * 5);
                  return (
                    <React.Fragment key={`days-${w}`}>
                      {weekDates.map((date, i) => {
                        const monthStr = String(date.getMonth() + 1).padStart(
                          2,
                          "0",
                        );
                        const dayStr = String(date.getDate()).padStart(2, "0");
                        const dateKey = `${monthStr}-${dayStr}`;
                        const isHoliday = holidays[dateKey];
                        return (
                          <th
                            key={i}
                            className={`text-[11.5px] ${isHoliday ? "bg-[#CCFFFF]" : "bg-orange-excel"}`}
                            style={fixedWidthStyle(DAY_CELL_WIDTH)}
                          >
                            {date.getDate()}
                          </th>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <th className="bg-white font-bold" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>{currentTotalHours}</th>
                <th className="bg-white font-bold" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>100</th>
              </tr>
              <tr>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={fixedWidthStyle(WEEK_LABEL_WIDTH, WEEK_LABEL_LEFT)}
                >
                  ชั่วโมงที่
                </th>
                {weeks.map((w) => {
                  const weekDates = dates.slice((w - 1) * 5, w * 5);
                  return (
                    <React.Fragment key={`hours-${w}`}>
                      {weekDates.map((date, i) => {
                        const monthStr = String(date.getMonth() + 1).padStart(
                          2,
                          "0",
                        );
                        const dayStr = String(date.getDate()).padStart(2, "0");
                        const dateKey = `${monthStr}-${dayStr}`;
                        const isHoliday = holidays[dateKey];
                        const hourText = attendance?.hoursMap?.[dateKey] || "";
                        return (
                          <th
                            key={i}
                            className={`text-[10px] ${isHoliday ? "bg-[#CCFFFF]" : "bg-orange-excel"}`}
                            style={fixedWidthStyle(DAY_CELL_WIDTH)}
                          >
                            {!isHoliday && hourText}
                          </th>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <th className="bg-white font-bold text-blue-600" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>
                  {totalScheduledHours}
                </th>
                <th className="bg-white font-bold text-blue-600" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>
                  {scheduledPercentage}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((student, index) => {
                  let attendedHours = 0;
                  dates.forEach((date) => {
                    const monthStr = String(date.getMonth() + 1).padStart(
                      2,
                      "0",
                    );
                    const dayStr = String(date.getDate()).padStart(2, "0");
                    const dateKey = `${monthStr}-${dayStr}`;
                    const record = attendance?.records?.[student.id]?.[dateKey];
                    if (record && record.trim() !== "") {
                      const hourText = attendance?.hoursMap?.[dateKey] || "";
                      attendedHours += getHoursFromText(hourText);
                    }
                  });

                  const attendancePercentage =
                    currentTotalHours > 0
                      ? ((attendedHours / currentTotalHours) * 100).toFixed(2)
                      : "0.00";

                  return (
                    <tr key={student.id}>
                      <td
                        className="text-center sticky left-0 z-10 bg-white"
                        style={fixedWidthStyle(STUDENT_NO_WIDTH)}
                      >
                        {index + 1}
                      </td>
                      <td
                        className="sticky z-10 bg-white"
                        style={fixedWidthStyle(STUDENT_CODE_WIDTH, STUDENT_CODE_LEFT)}
                      >
                        <div className="px-1 text-center">
                          {student.studentId}
                        </div>
                      </td>
                      <td
                        className="sticky z-10 bg-white"
                        style={fixedWidthStyle(CITIZEN_ID_WIDTH, CITIZEN_ID_LEFT)}
                      >
                        <div className="px-1 text-center">
                          {student.citizenId || ""}
                        </div>
                      </td>
                      <td
                        className="sticky z-10 bg-white"
                        style={fixedWidthStyle(STUDENT_NAME_WIDTH, STUDENT_NAME_LEFT)}
                      >
                        <div className="px-2 text-left truncate">
                          {student.name}
                        </div>
                      </td>
                      <td
                        className="bg-slate-50 sticky z-10 border-r-2 border-r-slate-400"
                        style={fixedWidthStyle(WEEK_LABEL_WIDTH, WEEK_LABEL_LEFT)}
                      ></td>
                      {dates.map((date, i) => {
                        const monthStr = String(date.getMonth() + 1).padStart(
                          2,
                          "0",
                        );
                        const dayStr = String(date.getDate()).padStart(2, "0");
                        const dateKey = `${monthStr}-${dayStr}`;
                        const isHoliday = holidays[dateKey];

                        if (isHoliday) {
                          if (index === 0) {
                            return (
                              <td
                                key={i}
                                rowSpan={Math.max(12, data.length)}
                                className="bg-[#CCFFFF] align-middle p-0 border-x border-slate-300"
                                style={fixedWidthStyle(DAY_CELL_WIDTH)}
                              >
                                <div
                                  className="flex justify-center items-center h-full"
                                  style={{ minHeight: "300px" }}
                                >
                                  <div
                                    className="text-red-500 text-[12px] whitespace-nowrap"
                                    style={{
                                      writingMode: "vertical-rl",
                                      transform: "rotate(180deg)",
                                    }}
                                  >
                                    {holidays[dateKey]}
                                  </div>
                                </div>
                              </td>
                            );
                          }
                          return null; // Skip rendering cell if it's merged
                        }

                        const record =
                          attendance?.records?.[student.id]?.[dateKey] || "";

                        return (
                          <td key={i} className="p-0" style={fixedWidthStyle(DAY_CELL_WIDTH)}>
                            <input
                              type="text"
                              className="excel-input w-full h-full text-center"
                              value={record}
                              onChange={(e) =>
                                handleAttendanceChange(
                                  student.id,
                                  dateKey,
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                        );
                      })}
                      <td className="text-center font-bold" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>{attendedHours}</td>
                      <td className="text-center font-bold" style={fixedWidthStyle(SUMMARY_CELL_WIDTH)}>
                        {attendancePercentage}
                      </td>
                      <td className="text-center font-bold text-green-600" style={fixedWidthStyle(RESULT_CELL_WIDTH)}>
                        {attendedHours >= currentTotalHours * 0.8 ? "ผ" : "มผ"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={dates.length + 8}
                    className="text-center py-8 text-slate-500 bg-white"
                  >
                    {rosterLocked
                      ? "ยังไม่มีรายชื่อนักเรียนจากทะเบียน/การจัดชั้น"
                      : "ยังไม่มีข้อมูลนักเรียน กรุณาเพิ่มรายชื่อนักเรียน"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setEditModalMode("students")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-bold text-white shadow transition hover:bg-blue-700"
          >
            แก้ไขรายชื่อนักเรียน
          </button>
          <button
            type="button"
            onClick={() => setEditModalMode("attendance")}
            className="rounded-lg bg-slate-900 px-6 py-3 text-lg font-bold text-white shadow transition hover:bg-slate-800"
          >
            ระบบช่วยลงเวลาเรียน
          </button>
        </div>

        {editModalMode &&
          typeof document !== "undefined" &&
          createPortal(
            <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur-sm sm:py-10">
              <div className="flex min-h-full items-start justify-center">
                <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="grid grid-cols-[40px_1fr_40px] items-center gap-3 border-b border-slate-100 bg-white p-6">
                    <span aria-hidden="true" />
                    <h3 className="text-center text-2xl font-bold text-slate-800">
                      {editModalMode === "students"
                        ? "แก้ไขรายชื่อนักเรียน"
                        : "ระบบช่วยลงเวลาเรียน"}
                    </h3>
                    <button
                      type="button"
                      aria-label="ปิดหน้าต่าง"
                      onClick={() => setEditModalMode(null)}
                      className="justify-self-end rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

              <div className="space-y-10 p-6 sm:p-8">
                {/* รายชื่อนักเรียน */}
                <section className={editModalMode === "students" ? "" : "hidden"}>
                  <h4 className="border-b border-slate-200 pb-3 mb-5 text-center text-lg font-bold text-slate-800">
                    รายชื่อนักเรียน
                  </h4>
                  {rosterLocked ? (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 px-4 py-3 rounded-xl mb-6">
                      รายชื่อนักเรียนอ้างอิงจากทะเบียนและการจัดชั้น
                      แก้ไขรายชื่อได้จากเมนูผู้ดูแลระบบ
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-8 mb-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="studentMode"
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                            checked={studentMode === "single"}
                            onChange={() => setStudentMode("single")}
                          />
                          <span className="text-slate-700 font-medium">
                            เพิ่มทีละคน
                          </span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="studentMode"
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                            checked={studentMode === "multiple"}
                            onChange={() => setStudentMode("multiple")}
                          />
                          <span className="text-slate-700 font-medium">
                            เพิ่มทีละหลายคน (Excel)
                          </span>
                        </label>
                      </div>

                      {studentMode === "single" ? (
                        <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[88px_150px_230px_minmax(260px,1fr)] lg:items-end">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                เลขที่
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={newStudent.number}
                                onChange={(e) =>
                                  setNewStudent({
                                    ...newStudent,
                                    number: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                เลขประจำตัว
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={newStudent.studentId}
                                onChange={(e) =>
                                  setNewStudent({
                                    ...newStudent,
                                    studentId: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                เลขประจำตัวประชาชน
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={newStudent.citizenId}
                                onChange={(e) =>
                                  setNewStudent({
                                    ...newStudent,
                                    citizenId: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                ชื่อ-สกุล
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={newStudent.name}
                                onChange={(e) =>
                                  setNewStudent({
                                    ...newStudent,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleAddSingleStudent()
                                }
                              />
                            </div>
                          </div>
                          <div className="flex justify-center mt-2">
                            <button
                              type="button"
                              onClick={handleAddSingleStudent}
                              disabled={!newStudent.name}
                              className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={18} /> เพิ่มนักเรียนใหม่
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4 items-center bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm"
                          >
                            <Download size={18} /> ดาวน์โหลดเทมเพลต Excel
                          </button>
                          <div className="relative">
                            <input
                              type="file"
                              accept=".xlsx"
                              onChange={handleFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">
                              <Upload size={18} /> อัปโหลดไฟล์ Excel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {data.length > 0 && (
                    <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h5 className="font-medium text-slate-700">
                          รายชื่อนักเรียนที่เพิ่มแล้ว ({data.length} คน)
                        </h5>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 w-16 text-center">
                                ลำดับ
                              </th>
                              <th className="px-4 py-2">เลขประจำตัว</th>
                              <th className="px-4 py-2">เลขประจำตัวประชาชน</th>
                              <th className="px-4 py-2">ชื่อ-สกุล</th>
                              <th className="px-4 py-2 w-32 text-center">
                                เป้าหมายเวลาเรียน (%)
                              </th>
                              {!rosterLocked && (
                                <th className="px-4 py-2 w-28 text-center">
                                  จัดการ
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((student, idx) => {
                              const isEditing = editingStudentId === student.id;

                              return (
                              <tr
                                key={student.id}
                                className="border-b border-slate-100 hover:bg-slate-50"
                              >
                                <td className="px-4 py-2 text-center">
                                  {idx + 1}
                                </td>
                                <td className="px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      className="w-full min-w-[100px] rounded border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                      value={studentDraft.studentId}
                                      onChange={(e) =>
                                        setStudentDraft((draft) => ({
                                          ...draft,
                                          studentId: e.target.value,
                                        }))
                                      }
                                    />
                                  ) : (
                                    student.studentId
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      className="w-full min-w-[150px] rounded border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                      value={studentDraft.citizenId}
                                      onChange={(e) =>
                                        setStudentDraft((draft) => ({
                                          ...draft,
                                          citizenId: e.target.value,
                                        }))
                                      }
                                    />
                                  ) : (
                                    student.citizenId
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      className="w-full min-w-[220px] rounded border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                      value={studentDraft.name}
                                      onChange={(e) =>
                                        setStudentDraft((draft) => ({
                                          ...draft,
                                          name: e.target.value,
                                        }))
                                      }
                                    />
                                  ) : (
                                    student.name
                                  )}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-16 border border-slate-300 rounded p-1 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={
                                        isEditing
                                          ? studentDraft.targetPercentage
                                          : student.targetPercentage ?? 100
                                      }
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const newTarget = isNaN(val)
                                          ? 100
                                          : val;
                                        if (isEditing) {
                                          setStudentDraft((draft) => ({
                                            ...draft,
                                            targetPercentage: newTarget,
                                          }));
                                        } else {
                                          onChange(
                                            data.map((s) =>
                                              s.id === student.id
                                                ? {
                                                    ...s,
                                                    targetPercentage: newTarget,
                                                  }
                                                : s,
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <span className="text-slate-500">%</span>
                                  </div>
                                </td>
                                {!rosterLocked && (
                                  <td className="px-4 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {isEditing ? (
                                        <button
                                          type="button"
                                          onClick={saveStudentDraft}
                                          disabled={savingStudentId === student.id}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                                          title="บันทึก"
                                        >
                                          <Check size={16} />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => beginEditStudent(student)}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                                          title="แก้ไข"
                                        >
                                          <Pencil size={16} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => deleteStudent(student.id, idx)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-100 transition hover:bg-red-100"
                                        title="ลบ"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>

                {/* 1. จำนวนวันที่เรียน/สัปดาห์ */}
                <section className={editModalMode === "attendance" ? "" : "hidden"}>
                  <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-3 mb-5">
                    1. วันที่เรียน
                  </h4>
                  <div className="flex items-center gap-4 mb-6">
                    <label className="w-48 text-slate-700 font-medium">
                      จำนวนวันที่เรียน/สัปดาห์:
                    </label>
                    <select
                      className="border border-slate-300 rounded-lg p-2.5 w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      value={daysPerWeek}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setDaysPerWeek(val);
                        let newSchedule = [...schedule];
                        if (newSchedule.length > val) {
                          newSchedule = newSchedule.slice(0, val);
                        } else {
                          while (newSchedule.length < val) {
                            const usedDays = newSchedule.map(
                              (s) => s.dayOfWeek,
                            );
                            let nextDay = 1;
                            while (usedDays.includes(nextDay) && nextDay <= 5)
                              nextDay++;
                            if (nextDay > 5) nextDay = 1;
                            newSchedule.push({ dayOfWeek: nextDay, hours: 1 });
                          }
                        }

                        // Reset hours to distribute currentHoursPerWeek
                        for (let i = 0; i < newSchedule.length - 1; i++) {
                          newSchedule[i].hours = 1;
                        }
                        const sumOthers = newSchedule
                          .slice(0, -1)
                          .reduce((acc, curr) => acc + curr.hours, 0);
                        newSchedule[newSchedule.length - 1].hours = Math.max(
                          1,
                          currentHoursPerWeek - sumOthers,
                        );

                        setSchedule(newSchedule);
                      }}
                    >
                      {[1, 2, 3, 4, 5]
                        .filter((n) => n <= currentHoursPerWeek)
                        .map((n) => (
                          <option key={n} value={n}>
                            {n} วัน
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-4 pl-6 border-l-4 border-blue-100 flex flex-col">
                    {schedule.map((item, idx) => {
                      const usedDays = schedule.map((s) => s.dayOfWeek);
                      const isLastDay = idx === schedule.length - 1;

                      // Calculate max hours for this day
                      const sumOthersExceptLastAndIdx = schedule.reduce(
                        (acc, curr, i) => {
                          if (i === idx || i === schedule.length - 1)
                            return acc;
                          return acc + curr.hours;
                        },
                        0,
                      );
                      const remainingForIdxAndLast =
                        currentHoursPerWeek - sumOthersExceptLastAndIdx;
                      const maxForIdx = remainingForIdxAndLast - 1; // leave at least 1 for the last day
                      const hoursOptions = [];
                      for (let i = 1; i <= Math.max(1, maxForIdx); i++) {
                        hoursOptions.push(i);
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100"
                        >
                          <span className="w-16 font-medium text-slate-700">
                            วันที่ {idx + 1}:
                          </span>
                          <select
                            className="border border-slate-300 rounded-lg p-2 w-32 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={item.dayOfWeek}
                            onChange={(e) => {
                              const newSchedule = [...schedule];
                              newSchedule[idx].dayOfWeek = parseInt(
                                e.target.value,
                              );
                              setSchedule(newSchedule);
                            }}
                          >
                            {[1, 2, 3, 4, 5].map((day) => (
                              <option
                                key={day}
                                value={day}
                                disabled={
                                  usedDays.includes(day) &&
                                  day !== item.dayOfWeek
                                }
                              >
                                {day === 1
                                  ? "จันทร์"
                                  : day === 2
                                    ? "อังคาร"
                                    : day === 3
                                      ? "พุธ"
                                      : day === 4
                                        ? "พฤหัสบดี"
                                        : "ศุกร์"}
                              </option>
                            ))}
                          </select>
                          <span className="text-slate-600">จำนวน</span>
                          {isLastDay ? (
                            <div className="border border-slate-200 bg-slate-100 rounded-lg p-2 w-24 text-center text-slate-600 font-medium">
                              {item.hours}
                            </div>
                          ) : (
                            <select
                              className="border border-slate-300 rounded-lg p-2 w-24 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              value={item.hours}
                              onChange={(e) => {
                                const newSchedule = [...schedule];
                                newSchedule[idx].hours = parseInt(
                                  e.target.value,
                                );
                                // Recalculate last day
                                const sumOthers = newSchedule
                                  .slice(0, -1)
                                  .reduce((acc, curr) => acc + curr.hours, 0);
                                newSchedule[newSchedule.length - 1].hours =
                                  Math.max(1, currentHoursPerWeek - sumOthers);
                                setSchedule(newSchedule);
                              }}
                            >
                              {hoursOptions.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          )}
                          <span className="text-slate-600">ชั่วโมง</span>
                          {isLastDay && schedule.length > 1 && (
                            <span className="text-sm text-slate-500 ml-2">
                              (คำนวณอัตโนมัติ)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 2. เวลาเรียน ชั่วโมง/สัปดาห์ */}
                <section className={editModalMode === "attendance" ? "" : "hidden"}>
                  <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-3 mb-5">
                    2. เวลาเรียน
                  </h4>
                  <div className="flex items-center gap-4 mb-4">
                    <label className="w-48 text-slate-700 font-medium">
                      เวลาเรียน ชั่วโมง/สัปดาห์:
                    </label>
                    <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5 w-32 text-slate-600 font-medium text-center">
                      {currentHoursPerWeek} ชั่วโมง
                    </div>
                    <span className="text-sm text-slate-500">
                      (อ้างอิงจากข้อมูลหน้าปก)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="w-48 text-slate-700 font-medium">
                      ระยะเวลาเรียน:
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 font-bold text-slate-800">
                      {studyPeriodText || "ยังไม่ได้กำหนดระยะเวลาเรียน"}
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  {editModalMode === "attendance" && (
                    <button
                      type="button"
                      onClick={handleClearAttendance}
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={16} /> ล้างเวลาเรียน
                    </button>
                  )}
                  {editModalMode === "students" && !rosterLocked && (
                    <button
                      type="button"
                      onClick={handleClearStudents}
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={16} /> ล้างรายชื่อนักเรียน
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={
                      editModalMode === "students"
                        ? handleSaveStudentsModal
                        : () => setEditModalMode(null)
                    }
                    disabled={Boolean(savingStudentId)}
                    className={
                      editModalMode === "students"
                        ? "rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        : "rounded-lg border border-slate-300 px-6 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    }
                  >
                    {editModalMode === "students" ? "บันทึกข้อมูล" : "ยกเลิก"}
                  </button>
                  {editModalMode === "attendance" && (
                    <button
                      type="button"
                      onClick={handleGenerateAttendance}
                      className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      บันทึกและสร้างตาราง
                    </button>
                  )}
                </div>
              </div>

                </div>
              </div>
            </div>,
            document.body,
          )}
        {confirmationDialogPortal}
      </div>
    </div>
  );
};
