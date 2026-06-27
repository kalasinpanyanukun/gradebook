import React, { useMemo, useState, useEffect } from "react";
import { AppData, Student } from "../types";
import { X, Upload, Download, Trash2, Plus } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface Props {
  data: AppData["students"];
  generalInfo: AppData["generalInfo"];
  attendance?: AppData["attendance"];
  rosterLocked?: boolean;
  onChange: (data: AppData["students"]) => void;
  onAttendanceChange?: (attendance: AppData["attendance"]) => void;
}

export const StudentsForm: React.FC<Props> = ({
  data,
  generalInfo,
  attendance,
  rosterLocked = false,
  onChange,
  onAttendanceChange,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentMode, setStudentMode] = useState<"single" | "multiple">(
    "single",
  );
  const [newStudent, setNewStudent] = useState({
    number: "",
    studentId: "",
    citizenId: "",
    name: "",
  });
  const [daysPerWeek, setDaysPerWeek] = useState(1);
  const [schedule, setSchedule] = useState([{ dayOfWeek: 1, hours: 1 }]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const currentHoursPerWeek = parseInt(generalInfo.totalHours) || 1;
  const currentTotalHours = currentHoursPerWeek * 20;

  useEffect(() => {
    if (showEditModal) {
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
        setStartDate(attendance.settings.startDate || "");
        setEndDate(attendance.settings.endDate || "");
      }

      if (!attendance?.settings?.startDate && !attendance?.settings?.endDate) {
        const yearStr =
          generalInfo.academicYear || new Date().getFullYear().toString();
        // Convert Buddhist year to Gregorian if needed (assuming > 2500 is Buddhist)
        const yearNum = parseInt(yearStr);
        const gregorianYear = yearNum > 2500 ? yearNum - 543 : yearNum;

        if (generalInfo.semester === "1") {
          setStartDate(`${gregorianYear}-05-16`);
          setEndDate(`${gregorianYear}-09-30`);
        } else if (generalInfo.semester === "2") {
          setStartDate(`${gregorianYear}-10-16`);
          setEndDate(`${gregorianYear + 1}-03-31`);
        }
      }
    }
  }, [
    showEditModal,
    attendance?.settings,
    generalInfo.semester,
    generalInfo.academicYear,
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

  const handleChange = (id: string, field: keyof Student, value: string) => {
    if (rosterLocked) return;
    onChange(data.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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

  const handleGenerateAttendance = () => {
    let currentStudents = [...data];

    if (!rosterLocked && studentMode === "single" && newStudent.name) {
      const newId = Date.now().toString();
      currentStudents.push({
        id: newId,
        studentId: newStudent.studentId,
        citizenId: newStudent.citizenId,
        name: newStudent.name,
      });
      onChange(currentStudents);
      setNewStudent({ number: "", studentId: "", citizenId: "", name: "" });
    }

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

    setShowEditModal(false);
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

  return (
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto">
      <div
        className="bg-white p-10 w-full rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]"
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
        </div>

        <div className="overflow-x-auto">
          <table className="excel-table whitespace-nowrap w-full relative">
            <thead>
              <tr>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky left-0 z-20"
                  style={{ width: "40px", minWidth: "40px", maxWidth: "40px" }}
                >
                  เลขที่
                </th>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky z-20"
                  style={{
                    left: "40px",
                    width: "96px",
                    minWidth: "96px",
                    maxWidth: "96px",
                  }}
                >
                  เลขประจำตัว
                </th>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky z-20"
                  style={{
                    left: "136px",
                    width: "128px",
                    minWidth: "128px",
                    maxWidth: "128px",
                  }}
                >
                  เลขประจำตัวประชาชน
                </th>
                <th
                  rowSpan={4}
                  className="bg-orange-excel sticky z-20"
                  style={{
                    left: "264px",
                    width: "250px",
                    minWidth: "250px",
                    maxWidth: "250px",
                  }}
                >
                  ชื่อ - สกุล
                </th>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={{
                    left: "514px",
                    width: "64px",
                    minWidth: "64px",
                    maxWidth: "64px",
                  }}
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
                <th rowSpan={4} className="bg-orange-excel">
                  สรุปผล
                  <br />
                  การประเมิน
                </th>
              </tr>
              <tr>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={{
                    left: "514px",
                    width: "64px",
                    minWidth: "64px",
                    maxWidth: "64px",
                  }}
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
                        className="bg-orange-excel text-[10px]"
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
                      className="bg-orange-excel text-[10px]"
                    >
                      {monthText}
                    </th>
                  );
                })}
                <th className="bg-orange-excel">ชั่วโมง</th>
                <th className="bg-orange-excel">มาเรียน%</th>
              </tr>
              <tr>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={{
                    left: "514px",
                    width: "64px",
                    minWidth: "64px",
                    maxWidth: "64px",
                  }}
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
                            className={`text-[10px] ${isHoliday ? "bg-[#CCFFFF]" : "bg-orange-excel"}`}
                            style={{ minWidth: "24px" }}
                          >
                            {date.getDate()}
                          </th>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <th className="bg-white font-bold">{currentTotalHours}</th>
                <th className="bg-white font-bold">100</th>
              </tr>
              <tr>
                <th
                  className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400"
                  style={{
                    left: "514px",
                    width: "64px",
                    minWidth: "64px",
                    maxWidth: "64px",
                  }}
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
                          >
                            {!isHoliday && hourText}
                          </th>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <th className="bg-white font-bold text-blue-600">
                  {totalScheduledHours}
                </th>
                <th className="bg-white font-bold text-blue-600">
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
                        style={{
                          width: "40px",
                          minWidth: "40px",
                          maxWidth: "40px",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        className="sticky z-10 bg-white"
                        style={{
                          left: "40px",
                          width: "96px",
                          minWidth: "96px",
                          maxWidth: "96px",
                        }}
                      >
                        {rosterLocked ? (
                          <div className="px-1 text-center">
                            {student.studentId}
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="excel-input text-center w-full"
                            value={student.studentId}
                            onChange={(e) =>
                              handleChange(
                                student.id,
                                "studentId",
                                e.target.value,
                              )
                            }
                          />
                        )}
                      </td>
                      <td
                        className="sticky z-10 bg-white"
                        style={{
                          left: "136px",
                          width: "128px",
                          minWidth: "128px",
                          maxWidth: "128px",
                        }}
                      >
                        {rosterLocked ? (
                          <div className="px-1 text-center">
                            {student.citizenId || ""}
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="excel-input text-center w-full"
                            value={student.citizenId || ""}
                            onChange={(e) =>
                              handleChange(
                                student.id,
                                "citizenId",
                                e.target.value,
                              )
                            }
                          />
                        )}
                      </td>
                      <td
                        className="sticky z-10 bg-white"
                        style={{
                          left: "264px",
                          width: "250px",
                          minWidth: "250px",
                          maxWidth: "250px",
                        }}
                      >
                        {rosterLocked ? (
                          <div className="px-2 text-left truncate">
                            {student.name}
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="excel-input text-left px-2 w-full"
                            value={student.name}
                            onChange={(e) =>
                              handleChange(student.id, "name", e.target.value)
                            }
                          />
                        )}
                      </td>
                      <td
                        className="bg-slate-50 sticky z-10 border-r-2 border-r-slate-400"
                        style={{
                          left: "514px",
                          width: "64px",
                          minWidth: "64px",
                          maxWidth: "64px",
                        }}
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
                          <td key={i} className="p-0">
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
                      <td className="text-center font-bold">{attendedHours}</td>
                      <td className="text-center font-bold">
                        {attendancePercentage}
                      </td>
                      <td className="text-center font-bold text-green-600">
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

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 font-bold text-lg"
          >
            แก้ไขข้อมูล
          </button>
        </div>

        {showEditModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white z-10">
                <h3 className="text-2xl font-bold text-slate-800">
                  แก้ไขข้อมูล
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full p-2"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-10">
                {/* 1. รายชื่อนักเรียน */}
                <section>
                  <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-3 mb-5">
                    1. รายชื่อนักเรียน
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
                          <div className="grid grid-cols-4 gap-6 items-end">
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
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={handleAddSingleStudent}
                              disabled={!newStudent.name}
                              className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={18} /> เพิ่มนักเรียน
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
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h5 className="font-medium text-slate-700">
                          รายชื่อนักเรียนที่เพิ่มแล้ว ({data.length} คน)
                        </h5>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
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
                                <th className="px-4 py-2 w-16 text-center">
                                  ลบ
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((student, idx) => (
                              <tr
                                key={student.id}
                                className="border-b border-slate-100 hover:bg-slate-50"
                              >
                                <td className="px-4 py-2 text-center">
                                  {idx + 1}
                                </td>
                                <td className="px-4 py-2">
                                  {student.studentId}
                                </td>
                                <td className="px-4 py-2">
                                  {student.citizenId}
                                </td>
                                <td className="px-4 py-2">{student.name}</td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-16 border border-slate-300 rounded p-1 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={student.targetPercentage ?? 100}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const newTarget = isNaN(val)
                                          ? 100
                                          : val;
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
                                      }}
                                    />
                                    <span className="text-slate-500">%</span>
                                  </div>
                                </td>
                                {!rosterLocked && (
                                  <td className="px-4 py-2 text-center">
                                    <button
                                      onClick={() =>
                                        onChange(
                                          data.filter(
                                            (s) => s.id !== student.id,
                                          ),
                                        )
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>

                {/* 2. จำนวนวันที่เรียน/สัปดาห์ */}
                <section>
                  <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-3 mb-5">
                    2. วันที่เรียน
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

                {/* 3. เวลาเรียน ชั่วโมง/สัปดาห์ */}
                <section>
                  <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-3 mb-5">
                    3. เวลาเรียน
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
                  <div className="text-blue-700 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                    </div>
                    <span>
                      ระบบคำนวณอัตโนมัติ: เวลาเรียน{" "}
                      <strong className="text-lg">{currentTotalHours}</strong>{" "}
                      ชั่วโมง/ภาคเรียน (กำหนด 1 ภาคเรียนมี 20 สัปดาห์)
                    </span>
                  </div>
                </section>

                {/* 4. เริ่มต้นเรียนตั้งแต่วันที่ */}
                <section>
                  <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-3 mb-5">
                    4. ระยะเวลาเรียน
                  </h4>
                  <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <label className="font-medium text-slate-700">
                        เริ่มต้นวันที่:
                      </label>
                      <input
                        type="date"
                        className="border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="font-medium text-slate-700">
                        ถึงวันที่:
                      </label>
                      <input
                        type="date"
                        className="border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-2xl mt-auto">
                <div className="flex gap-3">
                  <button
                    onClick={handleClearAttendance}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors text-sm"
                  >
                    <Trash2 size={16} /> ล้างเวลาเรียน
                  </button>
                  {!rosterLocked && (
                    <button
                      onClick={handleClearStudents}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors text-sm"
                    >
                      <Trash2 size={16} /> ล้างรายชื่อนักเรียน
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleGenerateAttendance}
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    บันทึกและสร้างตาราง
                  </button>
                </div>
              </div>

              {/* Confirmation Dialog */}
              {confirmDialog.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                    <div className="p-6">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <Trash2 className="text-red-600" size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {confirmDialog.title}
                      </h3>
                      <p className="text-slate-600">{confirmDialog.message}</p>
                    </div>
                    <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                      <button
                        onClick={() =>
                          setConfirmDialog((prev) => ({
                            ...prev,
                            isOpen: false,
                          }))
                        }
                        className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={confirmDialog.onConfirm}
                        className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                      >
                        ยืนยันการลบ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
