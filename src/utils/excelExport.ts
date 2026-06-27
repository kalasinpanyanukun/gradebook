import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const DEFAULT_SCHOOL_NAME = "โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์";
const DEFAULT_AGENCY_NAME = "สำนักบริหารงานการศึกษาพิเศษ";
const DEFAULT_LOGO_URL = "/logo3.png";
const LEGACY_LOGO_URL = "/logo1.png";

export const exportToExcel = async (data: any) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "App";
  workbook.created = new Date();
  const generalInfo = data.generalInfo ?? {};
  const schoolName = generalInfo.schoolName || DEFAULT_SCHOOL_NAME;
  const agencyName = generalInfo.agencyName || DEFAULT_AGENCY_NAME;
  const logoUrl =
    generalInfo.logoUrl && generalInfo.logoUrl !== LEGACY_LOGO_URL
      ? generalInfo.logoUrl
      : DEFAULT_LOGO_URL;
  const homeroomTeacher1 =
    generalInfo.homeroomTeacher1 ||
    generalInfo.homeroomTeachers?.split(" 2. ")?.[0]?.replace("1. ", "") ||
    "";
  const homeroomTeacher2 =
    generalInfo.homeroomTeacher2 ||
    generalInfo.homeroomTeachers?.split(" 2. ")?.[1] ||
    "";
  const homeroomTeacher3 = generalInfo.homeroomTeacher3 || "";

  const fontStyle = { name: "TH Sarabun PSK", size: 14 };
  const fontBold = { name: "TH Sarabun PSK", size: 14, bold: true };
  const fontTitle = { name: "TH Sarabun PSK", size: 16, bold: true };

  const fillYellow: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF00" },
  };
  const fillOrange: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFCE4D6" },
  };
  const fillGreen: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2EFDA" },
  };

  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const centerAlign: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
  };
  const centerWrap: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  const verticalAlign: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
    textRotation: 90,
    wrapText: true,
  };
  const leftAlign: Partial<ExcelJS.Alignment> = {
    horizontal: "left",
    vertical: "middle",
  };
  const rightAlign: Partial<ExcelJS.Alignment> = {
    horizontal: "right",
    vertical: "middle",
  };

  // --- Sheet 1: ปก (Portrait) ---
  const sheet1 = workbook.addWorksheet("ปก", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });
  sheet1.getColumn("A").width = 6;
  sheet1.getColumn("B").width = 4.5;
  sheet1.getColumn("C").width = 4.5;
  sheet1.getColumn("D").width = 4.5;
  sheet1.getColumn("E").width = 4.5;
  sheet1.getColumn("F").width = 4.5;
  sheet1.getColumn("G").width = 4.5;
  sheet1.getColumn("H").width = 4.5;
  sheet1.getColumn("I").width = 4.5;
  sheet1.getColumn("J").width = 4.5;
  sheet1.getColumn("K").width = 4.5;
  sheet1.getColumn("L").width = 22;
  sheet1.getColumn("M").width = 5.5;
  sheet1.getColumn("N").width = 5.5;
  sheet1.getColumn("O").width = 5.5;
  sheet1.getColumn("P").width = 5.5;

  try {
    const response = await fetch(logoUrl);
    if (!response.ok)
      throw new Error(`Logo request failed: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: "png",
    });
    sheet1.addImage(imageId, {
      tl: { col: 9.2, row: 1 },
      ext: { width: 85, height: 85 },
    });
  } catch (error) {
    console.error("Failed to load logo image for Excel export", error);
  }

  sheet1.getCell("O2").value = "ปพ. 5";
  sheet1.getCell("O2").font = fontTitle;
  sheet1.getCell("O2").alignment = { horizontal: "right" };

  sheet1.mergeCells("A7:P7");
  sheet1.getCell("A7").value = "แบบบันทึกผลการเรียนรายวิชา";
  sheet1.getCell("A7").font = fontTitle;
  sheet1.getCell("A7").alignment = centerAlign;

  sheet1.mergeCells("A8:P8");
  sheet1.getCell("A8").value =
    "ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551";
  sheet1.getCell("A8").font = fontTitle;
  sheet1.getCell("A8").alignment = centerAlign;

  sheet1.mergeCells("A9:P9");
  sheet1.getCell("A9").value = schoolName;
  sheet1.getCell("A9").font = fontTitle;
  sheet1.getCell("A9").alignment = centerAlign;

  sheet1.mergeCells("A10:P10");
  sheet1.getCell("A10").value = agencyName;
  sheet1.getCell("A10").font = fontTitle;
  sheet1.getCell("A10").alignment = centerAlign;

  sheet1.mergeCells("C12:E12");
  sheet1.getCell("C12").value = "ชั้นมัธยมศึกษาปีที่";
  sheet1.getCell("C12").alignment = rightAlign;
  sheet1.getCell("C12").font = fontBold;
  sheet1.mergeCells("F12:G12");
  sheet1.getCell("F12").value = data.generalInfo.gradeLevel || "";
  sheet1.getCell("F12").alignment = centerAlign;
  sheet1.getCell("F12").fill = fillYellow;

  sheet1.mergeCells("H12:I12");
  sheet1.getCell("H12").value = "ภาคเรียนที่";
  sheet1.getCell("H12").alignment = rightAlign;
  sheet1.getCell("H12").font = fontBold;
  sheet1.getCell("J12").value = data.generalInfo.semester || "1";
  sheet1.getCell("J12").alignment = centerAlign;
  sheet1.getCell("J12").fill = fillYellow;

  sheet1.getCell("L12").value = "ปีการศึกษา";
  sheet1.getCell("L12").alignment = centerAlign;
  sheet1.getCell("L12").font = fontBold;
  sheet1.mergeCells("M12:N12");
  sheet1.getCell("M12").value = data.generalInfo.academicYear || "2568";
  sheet1.getCell("M12").alignment = centerAlign;

  sheet1.mergeCells("B13:C13");
  sheet1.getCell("B13").value = "รหัสวิชา";
  sheet1.getCell("B13").alignment = rightAlign;
  sheet1.getCell("B13").font = fontBold;
  sheet1.mergeCells("D13:E13");
  sheet1.getCell("D13").value = data.generalInfo.subjectCode || "";
  sheet1.getCell("D13").alignment = centerAlign;
  sheet1.getCell("D13").fill = fillYellow;

  sheet1.mergeCells("F13:G13");
  sheet1.getCell("F13").value = "รายวิชา";
  sheet1.getCell("F13").alignment = rightAlign;
  sheet1.getCell("F13").font = fontBold;
  sheet1.mergeCells("H13:K13");
  sheet1.getCell("H13").value = data.generalInfo.subjectName || "";
  sheet1.getCell("H13").alignment = centerAlign;
  sheet1.getCell("H13").fill = fillYellow;

  sheet1.getCell("L13").value = "กลุ่มสาระการเรียนรู้";
  sheet1.getCell("L13").alignment = centerAlign;
  sheet1.getCell("L13").font = fontBold;
  sheet1.mergeCells("M13:P13");
  sheet1.getCell("M13").value = data.generalInfo.learningArea || "";
  sheet1.getCell("M13").alignment = centerAlign;
  sheet1.getCell("M13").fill = fillYellow;

  sheet1.mergeCells("C14:E14");
  sheet1.getCell("C14").value = "รวมเวลาเรียน";
  sheet1.getCell("C14").alignment = rightAlign;
  sheet1.getCell("C14").font = fontBold;
  sheet1.mergeCells("F14:G14");
  sheet1.getCell("F14").value = data.generalInfo.totalHours || "1";
  sheet1.getCell("F14").alignment = centerAlign;
  sheet1.getCell("F14").fill = fillYellow;
  sheet1.mergeCells("H14:I14");
  sheet1.getCell("H14").value = "ชั่วโมง/สัปดาห์";
  sheet1.getCell("H14").alignment = centerAlign;
  sheet1.getCell("H14").font = fontBold;
  sheet1.mergeCells("J14:K14");
  sheet1.getCell("J14").value = data.generalInfo.hoursPerSemester || "";
  sheet1.getCell("J14").alignment = centerAlign;
  sheet1.mergeCells("L14:M14");
  sheet1.getCell("L14").value = "ชั่วโมง/ภาคเรียน";
  sheet1.getCell("L14").alignment = leftAlign;
  sheet1.getCell("L14").font = fontBold;

  sheet1.mergeCells("D15:E15");
  sheet1.getCell("D15").value = "ครูผู้สอน";
  sheet1.getCell("D15").alignment = rightAlign;
  sheet1.getCell("D15").font = fontBold;
  sheet1.mergeCells("F15:L15");
  let teacherText = data.generalInfo.teacherName || "";
  if (data.generalInfo.teacherName2) {
    teacherText = `1. ${data.generalInfo.teacherName}  2. ${data.generalInfo.teacherName2}`;
  }
  sheet1.getCell("F15").value = teacherText;
  sheet1.getCell("F15").alignment = centerAlign;
  sheet1.getCell("F15").fill = fillYellow;

  sheet1.mergeCells("C16:E16");
  sheet1.getCell("C16").value = "ครูประจำชั้น 1.";
  sheet1.getCell("C16").alignment = rightAlign;
  sheet1.getCell("C16").font = fontBold;
  sheet1.mergeCells("F16:J16");
  sheet1.getCell("F16").value = homeroomTeacher1;
  sheet1.getCell("F16").alignment = centerAlign;
  sheet1.getCell("K16").value = "2.";
  sheet1.getCell("K16").alignment = rightAlign;
  sheet1.getCell("K16").font = fontBold;
  sheet1.mergeCells("L16:P16");
  sheet1.getCell("L16").value = homeroomTeacher3
    ? `${homeroomTeacher2}  3. ${homeroomTeacher3}`
    : homeroomTeacher2;
  sheet1.getCell("L16").alignment = leftAlign;

  // Summary Table on Cover
  const startRow = 18;
  sheet1.mergeCells(startRow, 1, startRow + 2, 1);
  sheet1.getCell(startRow, 1).value = "จำนวน\nนักเรียน\nทั้งหมด";

  sheet1.mergeCells(startRow, 2, startRow, 16);
  sheet1.getCell(startRow, 2).value = "สรุปผลการเรียน";

  sheet1.mergeCells(startRow + 1, 2, startRow + 1, 9);
  sheet1.getCell(startRow + 1, 2).value =
    "จำนวนนักเรียนที่ได้รับระดับผลการเรียน";

  sheet1.mergeCells(startRow + 1, 10, startRow + 1, 11);
  sheet1.getCell(startRow + 1, 10).value = "สรุป";

  sheet1.mergeCells(startRow + 1, 12, startRow + 2, 12);
  sheet1.getCell(startRow + 1, 12).value = "รายงานการประเมิน";

  sheet1.mergeCells(startRow + 1, 13, startRow + 1, 16);
  sheet1.getCell(startRow + 1, 13).value = "จำนวนนักเรียนที่ได้รับระดับคุณภาพ";

  const grades = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"];
  grades.forEach((g, i) => {
    sheet1.getCell(startRow + 2, 2 + i).value = g;
  });
  const passFail = ["ผ", "มผ"];
  passFail.forEach((p, i) => {
    sheet1.getCell(startRow + 2, 10 + i).value = p;
  });
  const qualities = ["ดีเยี่ยม\n(3)", "ดี\n(2)", "ผ่าน\n(1)", "ไม่ผ่าน\n(0)"];
  qualities.forEach((q, i) => {
    sheet1.getCell(startRow + 2, 13 + i).value = q;
  });

  const getAvg = (keys: string[], attrs: any) => {
    let sum = 0;
    let count = 0;
    keys.forEach((k) => {
      if (attrs[k] !== undefined && attrs[k] !== "") {
        sum += Number(attrs[k]);
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 0;
  };

  // Calculate Summary Data
  const summary = {
    totalStudents: data.students.length,
    grades: {
      "4": 0,
      "3.5": 0,
      "3": 0,
      "2.5": 0,
      "2": 0,
      "1.5": 0,
      "1": 0,
      "0": 0,
      ผ: 0,
      มผ: 0,
    },
    analytical: {
      "3": 0,
      "2": 0,
      "1": 0,
      "0": 0,
    },
    attributes: {
      "3": 0,
      "2": 0,
      "1": 0,
      "0": 0,
    },
  };

  data.students.forEach((student: any) => {
    const score = data.scores[student.id] || {};
    let totalBetweenTerm = 0;
    if (data.scoreConfig?.units) {
      data.scoreConfig.units.forEach((u: any, uIdx: number) => {
        u.indicators.forEach((ind: any, iIdx: number) => {
          if (ind) {
            totalBetweenTerm += Number(score[`u${uIdx}_i${iIdx}`]) || 0;
          }
        });
      });
    } else {
      Object.keys(score).forEach((key) => {
        if (key.startsWith("u") && key.includes("_i")) {
          totalBetweenTerm += Number(score[key]) || 0;
        }
      });
    }
    const midterm = Number(score.midterm) || 0;
    const final = Number(score.final) || 0;
    const totalScore = totalBetweenTerm + midterm + final;

    let grade = "0";
    if (totalScore >= 80) grade = "4";
    else if (totalScore >= 75) grade = "3.5";
    else if (totalScore >= 70) grade = "3";
    else if (totalScore >= 65) grade = "2.5";
    else if (totalScore >= 60) grade = "2";
    else if (totalScore >= 55) grade = "1.5";
    else if (totalScore >= 50) grade = "1";

    summary.grades[grade as keyof typeof summary.grades]++;

    if (totalScore >= 50) summary.grades["ผ"]++;
    else summary.grades["มผ"]++;

    // 2. Analytical
    const anal = data.analytical[student.id] || {};
    const avgAnal = getAvg(
      ["attr1", "attr2", "attr3", "attr4", "attr5", "attr6", "attr7"],
      anal,
    );
    summary.analytical[avgAnal.toString() as keyof typeof summary.analytical]++;

    // 3. Attributes
    const attr = data.attributes[student.id] || {};
    const avg1 = getAvg(["attr1_1", "attr1_2", "attr1_3", "attr1_4"], attr);
    const avg2 = getAvg(["attr2_1", "attr2_2"], attr);
    const avg3 = getAvg(["attr3_1", "attr3_2"], attr);
    const avg4 = getAvg(["attr4_1", "attr4_2"], attr);
    const avg5 = getAvg(["attr5_1", "attr5_2"], attr);
    const avg6 = getAvg(["attr6_1", "attr6_2"], attr);
    const avg7 = getAvg(["attr7_1", "attr7_2", "attr7_3"], attr);
    const avg8 = getAvg(["attr8_1", "attr8_2"], attr);
    const totalAvgAttr = Math.round(
      (avg1 + avg2 + avg3 + avg4 + avg5 + avg6 + avg7 + avg8) / 8,
    );
    summary.attributes[
      totalAvgAttr.toString() as keyof typeof summary.attributes
    ]++;
  });

  const getPercent = (count: number) => {
    if (summary.totalStudents === 0) return "0";
    return Math.round((count / summary.totalStudents) * 100).toString();
  };

  // Data rows
  sheet1.getCell(startRow + 3, 1).value = summary.totalStudents;
  sheet1.getCell(startRow + 3, 2).value = summary.grades["4"];
  sheet1.getCell(startRow + 3, 3).value = summary.grades["3.5"];
  sheet1.getCell(startRow + 3, 4).value = summary.grades["3"];
  sheet1.getCell(startRow + 3, 5).value = summary.grades["2.5"];
  sheet1.getCell(startRow + 3, 6).value = summary.grades["2"];
  sheet1.getCell(startRow + 3, 7).value = summary.grades["1.5"];
  sheet1.getCell(startRow + 3, 8).value = summary.grades["1"];
  sheet1.getCell(startRow + 3, 9).value = summary.grades["0"];
  sheet1.getCell(startRow + 3, 10).value = summary.grades["ผ"];
  sheet1.getCell(startRow + 3, 11).value = summary.grades["มผ"];
  sheet1.getCell(startRow + 3, 12).value = "การอ่านคิดวิเคราะห์และเขียน";
  sheet1.getCell(startRow + 3, 13).value = summary.analytical["3"];
  sheet1.getCell(startRow + 3, 14).value = summary.analytical["2"];
  sheet1.getCell(startRow + 3, 15).value = summary.analytical["1"];
  sheet1.getCell(startRow + 3, 16).value = summary.analytical["0"];

  sheet1.getCell(startRow + 4, 1).value = "%";
  sheet1.getCell(startRow + 4, 2).value = getPercent(summary.grades["4"]);
  sheet1.getCell(startRow + 4, 3).value = getPercent(summary.grades["3.5"]);
  sheet1.getCell(startRow + 4, 4).value = getPercent(summary.grades["3"]);
  sheet1.getCell(startRow + 4, 5).value = getPercent(summary.grades["2.5"]);
  sheet1.getCell(startRow + 4, 6).value = getPercent(summary.grades["2"]);
  sheet1.getCell(startRow + 4, 7).value = getPercent(summary.grades["1.5"]);
  sheet1.getCell(startRow + 4, 8).value = getPercent(summary.grades["1"]);
  sheet1.getCell(startRow + 4, 9).value = getPercent(summary.grades["0"]);
  sheet1.getCell(startRow + 4, 10).value = summary.grades["ผ"];
  sheet1.getCell(startRow + 4, 11).value = summary.grades["มผ"];
  sheet1.getCell(startRow + 4, 12).value = "คุณลักษณะอันพึงประสงค์";
  sheet1.getCell(startRow + 4, 13).value = summary.attributes["3"];
  sheet1.getCell(startRow + 4, 14).value = summary.attributes["2"];
  sheet1.getCell(startRow + 4, 15).value = summary.attributes["1"];
  sheet1.getCell(startRow + 4, 16).value = summary.attributes["0"];

  // Apply styles to summary table
  for (let r = startRow; r <= startRow + 4; r++) {
    for (let c = 1; c <= 16; c++) {
      const cell = sheet1.getCell(r, c);
      cell.border = borderThin;
      cell.alignment = centerWrap;
      cell.font = { name: "TH Sarabun PSK", size: 14 };
    }
  }

  // Signature Lines
  let sigRow = 24;
  sheet1.mergeCells(sigRow, 1, sigRow, 16);
  sheet1.getCell(sigRow, 1).value = "การอนุมัติผลการเรียน";
  sheet1.getCell(sigRow, 1).font = fontBold;

  sigRow++;
  sheet1.mergeCells(sigRow, 3, sigRow, 10);
  sheet1.getCell(sigRow, 3).value =
    "ลงชื่อ .................................................................";
  sheet1.getCell(sigRow, 3).alignment = rightAlign;
  sheet1.mergeCells(sigRow, 11, sigRow, 16);
  sheet1.getCell(sigRow, 11).value = "ครูผู้สอน";
  sheet1.getCell(sigRow, 11).alignment = leftAlign;
  sigRow++;
  sheet1.mergeCells(sigRow, 5, sigRow, 10);
  sheet1.getCell(sigRow, 5).value = `( ${teacherText} )`;
  sheet1.getCell(sigRow, 5).alignment = centerAlign;

  sigRow += 2;
  sheet1.mergeCells(sigRow, 3, sigRow, 10);
  sheet1.getCell(sigRow, 3).value =
    "ลงชื่อ .................................................................";
  sheet1.getCell(sigRow, 3).alignment = rightAlign;
  sheet1.mergeCells(sigRow, 11, sigRow, 16);
  sheet1.getCell(sigRow, 11).value = "หัวหน้ากลุ่มสาระการเรียนรู้";
  sheet1.getCell(sigRow, 11).alignment = leftAlign;
  sigRow++;
  sheet1.mergeCells(sigRow, 5, sigRow, 10);
  sheet1.getCell(sigRow, 5).value =
    `( ${data.generalInfo.headOfLearningArea || ""} )`;
  sheet1.getCell(sigRow, 5).alignment = centerAlign;

  sigRow += 2;
  sheet1.mergeCells(sigRow, 3, sigRow, 10);
  sheet1.getCell(sigRow, 3).value =
    "ลงชื่อ .................................................................";
  sheet1.getCell(sigRow, 3).alignment = rightAlign;
  sheet1.mergeCells(sigRow, 11, sigRow, 16);
  sheet1.getCell(sigRow, 11).value = "หัวหน้างานวัดและประเมินผล";
  sheet1.getCell(sigRow, 11).alignment = leftAlign;
  sigRow++;
  sheet1.mergeCells(sigRow, 5, sigRow, 10);
  sheet1.getCell(sigRow, 5).value =
    `( ${data.generalInfo.headOfEvaluation || ""} )`;
  sheet1.getCell(sigRow, 5).alignment = centerAlign;

  sigRow += 2;
  sheet1.mergeCells(sigRow, 1, sigRow, 16);
  sheet1.getCell(sigRow, 1).value = "เรียนเสนอเพื่อพิจารณา";
  sheet1.getCell(sigRow, 1).font = fontBold;

  sigRow++;
  sheet1.mergeCells(sigRow, 3, sigRow, 10);
  sheet1.getCell(sigRow, 3).value =
    "ลงชื่อ .................................................................";
  sheet1.getCell(sigRow, 3).alignment = rightAlign;
  sheet1.mergeCells(sigRow, 11, sigRow, 16);
  sheet1.getCell(sigRow, 11).value = "รองผู้อำนวยการฝ่ายวิชาการ";
  sheet1.getCell(sigRow, 11).alignment = leftAlign;
  sigRow++;
  sheet1.mergeCells(sigRow, 5, sigRow, 10);
  sheet1.getCell(sigRow, 5).value =
    `( ${data.generalInfo.deputyDirector || ""} )`;
  sheet1.getCell(sigRow, 5).alignment = centerAlign;

  sigRow += 2;
  sheet1.mergeCells(sigRow, 5, sigRow, 10);
  sheet1.getCell(sigRow, 5).value = "☐ อนุมัติ          ☐ ไม่อนุมัติ";
  sheet1.getCell(sigRow, 5).alignment = centerAlign;

  sigRow += 2;
  sheet1.mergeCells(sigRow, 3, sigRow, 10);
  sheet1.getCell(sigRow, 3).value =
    "ลงชื่อ .................................................................";
  sheet1.getCell(sigRow, 3).alignment = rightAlign;
  sigRow++;
  sheet1.mergeCells(sigRow, 5, sigRow, 10);
  sheet1.getCell(sigRow, 5).value =
    `( ${data.generalInfo.schoolDirector || ""} )`;
  sheet1.getCell(sigRow, 5).alignment = centerAlign;
  sigRow++;
  sheet1.mergeCells(sigRow, 5, sigRow, 10);
  sheet1.getCell(sigRow, 5).value = `ผู้อำนวยการ${schoolName}`;
  sheet1.getCell(sigRow, 5).alignment = centerAlign;

  if (data.generalInfo.approvalDate) {
    const d = new Date(data.generalInfo.approvalDate);
    const formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
    sigRow++;
    sheet1.mergeCells(sigRow, 5, sigRow, 10);
    sheet1.getCell(sigRow, 5).value = formattedDate;
    sheet1.getCell(sigRow, 5).alignment = centerAlign;
  }

  // Add thick border around the page
  const lastRow = sigRow + 1;
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 1; c <= 16; c++) {
      const cell = sheet1.getCell(r, c);
      const currentBorder = cell.border || {};
      const newBorder: Partial<ExcelJS.Borders> = { ...currentBorder };

      if (r === 1) newBorder.top = { style: "medium" };
      if (r === lastRow) newBorder.bottom = { style: "medium" };
      if (c === 1) newBorder.left = { style: "medium" };
      if (c === 16) newBorder.right = { style: "medium" };

      // Handle corners
      if (r === 1 && c === 1) {
        newBorder.top = { style: "medium" };
        newBorder.left = { style: "medium" };
      }
      if (r === 1 && c === 16) {
        newBorder.top = { style: "medium" };
        newBorder.right = { style: "medium" };
      }
      if (r === lastRow && c === 1) {
        newBorder.bottom = { style: "medium" };
        newBorder.left = { style: "medium" };
      }
      if (r === lastRow && c === 16) {
        newBorder.bottom = { style: "medium" };
        newBorder.right = { style: "medium" };
      }

      cell.border = newBorder;
    }
  }

  // --- Sheet 2: ชื่อ+เวลา1+เวลา2 (Landscape) ---
  const sheet2 = workbook.addWorksheet("ชื่อ+เวลา1+เวลา2", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });
  sheet2.getColumn("A").width = 5;
  sheet2.getColumn("B").width = 15.75;
  sheet2.getColumn("C").width = 19.5;
  sheet2.getColumn("D").width = 19.5;
  sheet2.getColumn("E").width = 10;

  sheet2.mergeCells("A1:A4");
  sheet2.getCell("A1").value = "เลขที่";
  sheet2.mergeCells("B1:B4");
  sheet2.getCell("B1").value = "เลขประจำตัว";
  sheet2.mergeCells("C1:C4");
  sheet2.getCell("C1").value = "เลขประจำตัวประชาชน";
  sheet2.mergeCells("D1:D4");
  sheet2.getCell("D1").value = "ชื่อ - สกุล";

  sheet2.getCell("E1").value = "สัปดาห์ที่";
  sheet2.getCell("E2").value = "เดือน";
  sheet2.getCell("E3").value = "วันที่";
  sheet2.getCell("E4").value = "ชั่วโมงที่";

  const academicYearStr = data.generalInfo.academicYear || "2568";
  const semester = data.generalInfo.semester || "1";
  const academicYear = parseInt(academicYearStr) - 543;

  let currentDate =
    semester === "1"
      ? new Date(academicYear, 4, 10)
      : new Date(academicYear, 9, 25);
  while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const dates: Date[] = [];
  for (let i = 0; i < 100; i++) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const thaiMonths = [
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
  const thaiMonthsShort = [
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
  ];

  const holidays: Record<string, string> = {
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

  const getStartColForWeek = (w: number) => {
    let col = 6;
    if (w > 4) col += 1;
    if (w > 11) col += 1;
    if (w > 18) col += 1;
    return col + (w - 1) * 5;
  };

  const insertedCols = [26, 62, 98];
  insertedCols.forEach((col) => {
    sheet2.getColumn(col).width = 5;
    sheet2.mergeCells(1, col, 4, col);
    sheet2.getCell(1, col).value = "เลขที่";
    sheet2.getCell(1, col).alignment = centerWrap;
  });

  for (let w = 1; w <= 20; w++) {
    const startCol = getStartColForWeek(w);
    sheet2.mergeCells(1, startCol, 1, startCol + 4);
    sheet2.getCell(1, startCol).value = w;

    const weekDates = dates.slice((w - 1) * 5, w * 5);
    const startMonth = weekDates[0].getMonth();
    const endMonth = weekDates[4].getMonth();

    sheet2.mergeCells(2, startCol, 2, startCol + 4);
    if (startMonth === endMonth) {
      sheet2.getCell(2, startCol).value = thaiMonths[startMonth];
    } else {
      sheet2.getCell(2, startCol).value =
        `${thaiMonthsShort[startMonth]} - ${thaiMonthsShort[endMonth]}`;
    }

    for (let i = 0; i < 5; i++) {
      const date = weekDates[i];
      const col = startCol + i;
      sheet2.getColumn(col).width = 3.5;
      sheet2.getCell(3, col).value = date.getDate();

      const monthStr = String(date.getMonth() + 1).padStart(2, "0");
      const dayStr = String(date.getDate()).padStart(2, "0");
      const dateKey = `${monthStr}-${dayStr}`;

      if (holidays[dateKey]) {
        sheet2.getCell(4, col).value = holidays[dateKey];
        sheet2.getCell(4, col).font = {
          name: "TH Sarabun PSK",
          size: 10,
          color: { argb: "FFFF0000" },
          bold: true,
        };
        sheet2.getCell(4, col).alignment = {
          textRotation: 90,
          vertical: "middle",
          horizontal: "center",
        };
        sheet2.getCell(4, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFCCFFFF" },
        }; // Light blue
        sheet2.getCell(3, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFCCFFFF" },
        };
      } else if (data.attendance?.hoursMap?.[dateKey]) {
        sheet2.getCell(4, col).value = data.attendance.hoursMap[dateKey];
      }
    }
  }

  const lastCol = 109;
  sheet2.mergeCells(1, lastCol, 1, lastCol + 1);
  sheet2.getCell(1, lastCol).value = "รวมเวลาเรียนตลอดปี";

  sheet2.getCell(2, lastCol).value = "ชั่วโมง";
  sheet2.getCell(2, lastCol + 1).value = "มาเรียน%";

  sheet2.getCell(3, lastCol).value = 20;
  sheet2.getCell(3, lastCol + 1).value = 100;

  sheet2.getCell(4, lastCol).value = "";
  sheet2.getCell(4, lastCol + 1).value = "";

  sheet2.mergeCells(1, lastCol + 2, 4, lastCol + 2);
  sheet2.getCell(1, lastCol + 2).value = "สรุปผล\nการประเมิน";
  sheet2.getColumn(lastCol + 2).width = 12;

  sheet2.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber <= 4) {
      row.eachCell((cell, colNumber) => {
        if (!cell.fill) {
          if (
            (rowNumber === 3 || rowNumber === 4) &&
            (colNumber === lastCol || colNumber === lastCol + 1)
          ) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFFFFF" },
            };
          } else {
            cell.fill = fillOrange;
          }
        }
        cell.border = borderThin;
        if (!cell.alignment || !cell.alignment.textRotation) {
          cell.alignment = centerWrap;
        }
        if (cell.font && cell.font.color) {
          cell.font = {
            ...fontBold,
            color: cell.font.color,
            size: cell.font.size,
          };
        } else {
          cell.font = fontBold;
        }
      });
    }
  });

  const getHoursFromText = (text: string) => {
    if (!text) return 0;
    if (text.includes("-")) {
      const [start, end] = text.split("-").map(Number);
      return end - start + 1;
    }
    return 1;
  };

  const currentHoursPerWeek =
    data.attendance?.settings?.hoursPerWeek ||
    parseInt(data.generalInfo.totalHours) ||
    parseInt(data.generalInfo.hoursPerWeek) ||
    1;
  const currentTotalHours = currentHoursPerWeek * 20;

  for (let index = 0; index < 35; index++) {
    const row = index + 5;
    const student = data.students[index];

    let studentTotalHours = 0;

    if (student) {
      sheet2.getCell(`A${row}`).value = index + 1;
      sheet2.getCell(`B${row}`).value = student.studentId;
      sheet2.getCell(`C${row}`).value = student.citizenId;
      sheet2.getCell(`D${row}`).value = student.name;

      sheet2.getCell(`A${row}`).alignment = centerAlign;
      sheet2.getCell(`B${row}`).alignment = centerAlign;
      sheet2.getCell(`C${row}`).alignment = centerAlign;
      sheet2.getCell(`D${row}`).alignment = centerAlign;

      insertedCols.forEach((col) => {
        sheet2.getCell(row, col).value = index + 1;
        sheet2.getCell(row, col).alignment = centerAlign;
      });

      // Fill attendance records
      for (let w = 1; w <= 20; w++) {
        const startCol = getStartColForWeek(w);
        const weekDates = dates.slice((w - 1) * 5, w * 5);
        for (let i = 0; i < 5; i++) {
          const date = weekDates[i];
          const col = startCol + i;
          const monthStr = String(date.getMonth() + 1).padStart(2, "0");
          const dayStr = String(date.getDate()).padStart(2, "0");
          const dateKey = `${monthStr}-${dayStr}`;

          if (
            !holidays[dateKey] &&
            data.attendance?.records?.[student.id]?.[dateKey]
          ) {
            const mark = data.attendance.records[student.id][dateKey];
            sheet2.getCell(row, col).value = mark;
            sheet2.getCell(row, col).alignment = centerAlign;
            if (mark === "/") {
              studentTotalHours += getHoursFromText(
                data.attendance?.hoursMap?.[dateKey] || "",
              );
            }
          }
        }
      }
    } else {
      sheet2.getCell(`A${row}`).value = "";
      insertedCols.forEach((col) => {
        sheet2.getCell(row, col).value = "";
      });
    }

    if (student) {
      sheet2.getCell(row, lastCol).value = studentTotalHours;
      sheet2.getCell(row, lastCol).alignment = centerAlign;
      const percentage =
        currentTotalHours > 0
          ? (studentTotalHours / currentTotalHours) * 100
          : 0;
      sheet2.getCell(row, lastCol + 1).value = percentage.toFixed(2);
      sheet2.getCell(row, lastCol + 1).alignment = centerAlign;

      // Evaluation result
      const targetPct = student.targetPercentage ?? 100;
      const isPass = percentage >= targetPct;
      sheet2.getCell(row, lastCol + 2).value = isPass ? "ผ" : "มผ";
      sheet2.getCell(row, lastCol + 2).alignment = centerAlign;
      sheet2.getCell(row, lastCol + 2).font = fontBold;
    } else {
      sheet2.getCell(row, lastCol).value = "";
      sheet2.getCell(row, lastCol + 1).value = "";
      sheet2.getCell(row, lastCol + 2).value = "";
    }

    for (let c = 1; c <= lastCol + 2; c++) {
      sheet2.getCell(row, c).border = borderThin;

      // If it's a holiday column, fill the student row cell as well
      if (c >= 6 && c < lastCol && !insertedCols.includes(c)) {
        // Calculate dateIndex properly by skipping inserted columns
        let dateIndex = c - 6;
        if (c > 26) dateIndex -= 1;
        if (c > 62) dateIndex -= 1;
        if (c > 98) dateIndex -= 1;

        if (dateIndex >= 0 && dateIndex < dates.length) {
          const date = dates[dateIndex];
          const monthStr = String(date.getMonth() + 1).padStart(2, "0");
          const dayStr = String(date.getDate()).padStart(2, "0");
          const dateKey = `${monthStr}-${dayStr}`;
          if (holidays[dateKey]) {
            sheet2.getCell(row, c).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFCCFFFF" },
            };
          }
        }
      }
    }
  }

  // Apply thick borders
  const thickRightCols = [4, 5, 26, 62, 98, 110, 111];
  for (let w = 1; w <= 20; w++) {
    thickRightCols.push(getStartColForWeek(w) + 4);
  }

  for (let r = 1; r <= 39; r++) {
    // Outer left
    const leftCell = sheet2.getCell(r, 1);
    leftCell.border = { ...leftCell.border, left: { style: "medium" } };

    thickRightCols.forEach((c) => {
      const cell = sheet2.getCell(r, c);
      const currentBorder = cell.border || borderThin;
      cell.border = { ...currentBorder, right: { style: "medium" } };
    });
    thickRightCols.forEach((c) => {
      if (c < 111) {
        const nextCell = sheet2.getCell(r, c + 1);
        if (nextCell) {
          const nextCurrentBorder = nextCell.border || borderThin;
          nextCell.border = { ...nextCurrentBorder, left: { style: "medium" } };
        }
      }
    });
  }

  for (let c = 1; c <= 111; c++) {
    // Top outer
    const topCell = sheet2.getCell(1, c);
    topCell.border = { ...topCell.border, top: { style: "medium" } };
    // Bottom outer
    const bottomCell = sheet2.getCell(39, c);
    bottomCell.border = { ...bottomCell.border, bottom: { style: "medium" } };
    // Under headers
    const headerBottomCell = sheet2.getCell(4, c);
    headerBottomCell.border = {
      ...headerBottomCell.border,
      bottom: { style: "medium" },
    };
    const dataTopCell = sheet2.getCell(5, c);
    dataTopCell.border = { ...dataTopCell.border, top: { style: "medium" } };
  }

  // Merge holiday columns from row 4 to 39
  for (let w = 1; w <= 20; w++) {
    const startCol = getStartColForWeek(w);
    const weekDates = dates.slice((w - 1) * 5, w * 5);
    for (let i = 0; i < 5; i++) {
      const date = weekDates[i];
      const col = startCol + i;
      const monthStr = String(date.getMonth() + 1).padStart(2, "0");
      const dayStr = String(date.getDate()).padStart(2, "0");
      const dateKey = `${monthStr}-${dayStr}`;
      if (holidays[dateKey]) {
        sheet2.mergeCells(4, col, 39, col);
      }
    }
  }

  // --- Sheet 3: คะแนนรายตัวชี้วัด1+2 (Landscape) ---
  const sheet3 = workbook.addWorksheet("คะแนนรายตัวชี้วัด1+2", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Calculate columns
  const units = data.scoreConfig?.units || [];
  let unitCols = 0;
  units.forEach((u) => {
    unitCols += 6; // 5 indicators + 1 "รวม"
  });
  if (unitCols === 0) unitCols = 6; // fallback if no units

  const summaryCols = 8; // รวมระหว่างภาค, กลางภาค, ปลายภาค, รวมตลอดภาค, ปกติ, แก้ไข, ร้อยละ, สรุป
  const totalCols = 1 + unitCols + summaryCols; // 1 for เลขที่

  // Set column widths
  sheet3.getColumn(1).width = 30; // เลขที่
  for (let c = 2; c <= totalCols; c++) {
    sheet3.getColumn(c).width = 6.5; // Make columns wider to prevent squishing
  }

  // Define 16pt font
  const font16 = { name: "TH Sarabun PSK", size: 16 };
  const font16Bold = { name: "TH Sarabun PSK", size: 16, bold: true };

  // Row 1: Main Headers
  sheet3.getRow(1).height = 30;
  sheet3.getCell(1, 1).value = "หน่วยการเรียนรู้ที่";
  sheet3.getCell(1, 1).alignment = centerAlign;
  sheet3.getCell(1, 1).font = font16Bold;
  sheet3.getCell(1, 1).border = borderThin;

  sheet3.mergeCells(1, 2, 1, 1 + unitCols);
  sheet3.getCell(1, 2).value = "บันทึกคะแนนวัดและประเมินผลการเรียนรู้";
  sheet3.getCell(1, 2).alignment = centerAlign;
  sheet3.getCell(1, 2).font = font16Bold;
  sheet3.getCell(1, 2).border = borderThin;

  sheet3.mergeCells(1, 1 + unitCols + 1, 1, totalCols);
  sheet3.getCell(1, 1 + unitCols + 1).value =
    `ภาคเรียนที่ ${data.generalInfo.semester || "2"}`;
  sheet3.getCell(1, 1 + unitCols + 1).alignment = centerAlign;
  sheet3.getCell(1, 1 + unitCols + 1).font = font16Bold;
  sheet3.getCell(1, 1 + unitCols + 1).border = borderThin;

  // Row 2-6: Headers
  sheet3.getRow(2).height = 40; // หน่วยการเรียนรู้ที่
  sheet3.getRow(3).height = 100; // รหัสตัวชี้วัด
  sheet3.getRow(4).height = 30; // ปกติ/แก้ไข
  sheet3.getRow(5).height = 25; // คะแนนเต็ม
  sheet3.getRow(6).height = 25; // คะแนนตามเกณฑ์

  // Label Col (A)
  sheet3.mergeCells(2, 1, 4, 1);
  sheet3.getCell(2, 1).value = "รหัสตัวชี้วัด/ผลการเรียนรู้";
  sheet3.getCell(2, 1).alignment = centerWrap;
  sheet3.getCell(5, 1).value = "คะแนนเต็ม";
  sheet3.getCell(5, 1).alignment = centerWrap;
  sheet3.getCell(6, 1).value = "คะแนนตามเกณฑ์";
  sheet3.getCell(6, 1).alignment = centerWrap;

  // Units
  let currentCol = 2;
  const unitsToRender =
    units.length > 0 ? units : [{ name: "หน่วยการเรียนรู้", indicators: [] }];

  const indicatorCols: number[] = [];
  const sumCols: number[] = [];

  unitsToRender.forEach((u) => {
    // Unit Name
    sheet3.mergeCells(2, currentCol, 2, currentCol + 4);
    sheet3.getCell(2, currentCol).value = u.name;
    sheet3.getCell(2, currentCol).alignment = centerWrap;

    // Indicators (always 5 cols)
    for (let i = 0; i < 5; i++) {
      indicatorCols.push(currentCol);
      const ind = u.indicators[i];
      sheet3.mergeCells(3, currentCol, 4, currentCol);
      sheet3.getCell(3, currentCol).value = ind ? ind.code : "";
      sheet3.getCell(3, currentCol).alignment = verticalAlign;

      sheet3.getCell(5, currentCol).value = ind ? ind.fullScore || 0 : "";
      sheet3.getCell(6, currentCol).value = ind ? ind.passingScore || 0 : "";
      currentCol++;
    }

    // "รวม" column for unit
    sumCols.push(currentCol);
    sheet3.mergeCells(2, currentCol, 4, currentCol);
    sheet3.getCell(2, currentCol).value = "รวม";
    sheet3.getCell(2, currentCol).alignment = verticalAlign;
    sheet3.getCell(5, currentCol).value =
      u.indicators.reduce((sum, ind) => sum + (ind.fullScore || 0), 0) || "";
    sheet3.getCell(6, currentCol).value =
      u.indicators.reduce((sum, ind) => sum + (ind.passingScore || 0), 0) || "";
    currentCol++;
  });

  // Summary Block
  const summaryHeaders = [
    "รวมคะแนนหน่วยการเรียนรู้(ระหว่างภาคเรียน)",
    "คะแนนสอบกลางภาค",
    "คะแนนสอบปลายภาค",
    "รวมคะแนนตลอดภาคเรียน",
  ];
  const summaryFullScores = [70, 10, 20, 100];
  const summaryPassScores = [35, 5, 10, 50];

  summaryHeaders.forEach((header, idx) => {
    if (idx === 0 || idx === 3) {
      sumCols.push(currentCol);
    }
    sheet3.mergeCells(2, currentCol, 4, currentCol);
    sheet3.getCell(2, currentCol).value = header;
    sheet3.getCell(2, currentCol).alignment = verticalAlign;
    sheet3.getCell(5, currentCol).value = summaryFullScores[idx];
    sheet3.getCell(6, currentCol).value = summaryPassScores[idx];
    currentCol++;
  });

  // ระดับผลการเรียน
  sheet3.mergeCells(2, currentCol, 3, currentCol + 1);
  sheet3.getCell(2, currentCol).value = "ระดับผลการเรียน";
  sheet3.getCell(2, currentCol).alignment = centerWrap;

  sumCols.push(currentCol);
  sheet3.getCell(4, currentCol).value = "ปกติ";
  sheet3.getCell(4, currentCol).alignment = verticalAlign;
  currentCol++;

  sumCols.push(currentCol);
  sheet3.getCell(4, currentCol).value = "แก้ไข";
  sheet3.getCell(4, currentCol).alignment = verticalAlign;
  currentCol++;

  // ร้อยละ
  sumCols.push(currentCol);
  sheet3.mergeCells(2, currentCol, 4, currentCol);
  sheet3.getCell(2, currentCol).value = "ร้อยละ";
  sheet3.getCell(2, currentCol).alignment = verticalAlign;
  currentCol++;

  // สรุปจำนวนตัวชี้วัด
  sumCols.push(currentCol);
  sheet3.mergeCells(2, currentCol, 4, currentCol);
  sheet3.getCell(2, currentCol).value = "สรุปจำนวนตัวชี้วัด/ผลการเรียนรู้";
  sheet3.getCell(2, currentCol).alignment = verticalAlign;
  currentCol++;

  // Apply styling to headers (Rows 2-6)
  for (let r = 2; r <= 6; r++) {
    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet3.getCell(r, c);
      cell.border = borderThin;
      cell.font = font16Bold;
      if (indicatorCols.includes(c) && (r === 2 || r === 3 || r === 4)) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFFFF" },
        };
      } else {
        cell.fill = fillOrange;
      }
      if (r === 5 || r === 6) {
        cell.alignment = centerAlign;
      }
    }
  }

  // Data rows
  data.students.forEach((student: any, index: number) => {
    const row = index + 7;

    // Label
    sheet3.getCell(row, 1).value = index + 1;
    sheet3.getCell(row, 1).alignment = centerAlign;

    // Data
    const score = data.scores[student.id] || {};
    let c = 2;
    let totalBetweenTerm = 0;

    unitsToRender.forEach((u) => {
      let unitTotal = 0;
      for (let i = 0; i < 5; i++) {
        const ind = u.indicators[i];
        if (ind) {
          const val = score[`u${units.indexOf(u)}_i${i}`] || 0;
          sheet3.getCell(row, c).value = val;
          unitTotal += val;
        } else {
          sheet3.getCell(row, c).value = "";
        }
        sheet3.getCell(row, c).alignment = centerAlign;
        c++;
      }
      sheet3.getCell(row, c).value = unitTotal || "";
      sheet3.getCell(row, c).alignment = centerAlign;
      totalBetweenTerm += unitTotal;
      c++;
    });

    // Summary Data
    const midterm = score.midterm || 0;
    const final = score.final || 0;
    const totalScore = totalBetweenTerm + midterm + final;

    sheet3.getCell(row, c++).value = totalBetweenTerm || 0;
    sheet3.getCell(row, c++).value = midterm || 0;
    sheet3.getCell(row, c++).value = final || 0;
    sheet3.getCell(row, c++).value = totalScore || 0;

    // Grade
    let grade = "0";
    if (totalScore >= 80) grade = "4";
    else if (totalScore >= 75) grade = "3.5";
    else if (totalScore >= 70) grade = "3";
    else if (totalScore >= 65) grade = "2.5";
    else if (totalScore >= 60) grade = "2";
    else if (totalScore >= 55) grade = "1.5";
    else if (totalScore >= 50) grade = "1";

    sheet3.getCell(row, c++).value = grade; // ปกติ
    sheet3.getCell(row, c++).value = ""; // แก้ไข

    sheet3.getCell(row, c++).value = Math.round(totalScore); // ร้อยละ

    // สรุปผล (ผ / มผ)
    const isPass = totalScore >= 50; // Assuming 50 is passing score for the whole term
    sheet3.getCell(row, c++).value = isPass ? "ผ" : "มผ";

    // Apply borders and font to data row
    for (let col = 1; col <= totalCols; col++) {
      const cell = sheet3.getCell(row, col);
      cell.border = borderThin;
      cell.font = font16;
      cell.alignment = centerAlign;
      if (sumCols.includes(col)) {
        cell.fill = fillOrange;
      }
    }
  });

  const styleFail = {
    font: { name: "Sarabun", size: 16, color: { argb: "FFFF0000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } },
  };
  const stylePass = {
    font: { name: "Sarabun", size: 16, color: { argb: "FF000000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } },
  };
  const styleGood = {
    font: { name: "Sarabun", size: 16, color: { argb: "FF006400" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF90EE90" } },
  };

  const rowsToRender = Math.max(data.students.length, 30);

  // --- Sheet 4: คุณลักษณะ1-4 (Landscape) ---
  const sheet4 = workbook.addWorksheet("คุณลักษณะ1-4", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  sheet4.getColumn(1).width = 10;
  for (let i = 2; i <= 18; i++) {
    sheet4.getColumn(i).width = 6.5;
  }
  sheet4.getRow(3).height = 120;

  sheet4.mergeCells("A1:A3");
  sheet4.getCell("A1").value =
    "เลขที่/ภาคเรียนที่/ระดับคุณภาพ/ตัวชี้วัดคุณลักษณะ";
  sheet4.getCell("A1").alignment = verticalAlign;

  sheet4.mergeCells("B1:R1");
  sheet4.getCell("B1").value = "แบบบันทึกผลการประเมินคุณลักษณะอันพึงประสงค์";
  sheet4.getCell("B1").alignment = centerAlign;

  sheet4.mergeCells("B2:G2");
  sheet4.getCell("B2").value = "1. รักชาติ ศาสน์ กษัตริย์";
  sheet4.mergeCells("H2:K2");
  sheet4.getCell("H2").value = "2. ซื่อสัตย์สุจริต";
  sheet4.mergeCells("L2:N2");
  sheet4.getCell("L2").value = "3. มีวินัย";
  sheet4.mergeCells("O2:R2");
  sheet4.getCell("O2").value = "4. ใฝ่เรียนรู้";

  const sheet4HeadersRow3 = [
    "1.1 เป็นพลเมืองดีของชาติ",
    "1.2 ธำรงไว้ซึ่งความเข้มแข็งของชาติ",
    "1.3 ศรัทธา ยึดมั่นและปฏิบัติตนตามหลักศาสนา",
    "1.4 เคารพเทิดทูนสถาบันพระมหากษัตริย์",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
    "2.1 ประพฤติตรงตามความเป็นจริงต่อตนเองทั้งทางกาย วาจา ใจ",
    "2.2 ประพฤติตรงตามความเป็นจริงต่อผู้อื่นทั้งทางกาย วาจา ใจ",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
    "3.1 ปฏิบัติตามข้อตกลง กฎเกณฑ์ ระเบียบ ข้อบังคับของครอบครัว โรงเรียนและสังคม",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
    "4.1 ตั้งใจ เพียรพยายามในการเรียนและเข้าร่วมกิจกรรมการเรียนรู้",
    "4.2 แสวงหาความรู้จากแหล่งเรียนรู้ต่างๆ ทั้งภายในและภายนอกโรงเรียนด้วยการเลือกใช้สื่ออย่างเหมาะสมสรุปเป็นองค์ความรู้และสามารถนำไปใช้ในชีวิตประจำวันได้",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
  ];

  sheet4HeadersRow3.forEach((header, index) => {
    const cell = sheet4.getCell(3, index + 2);
    cell.value = header;
    cell.alignment = verticalAlign;
  });

  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 18; c++) {
      const cell = sheet4.getCell(r, c);
      cell.fill = fillOrange;
      cell.border = borderThin;
      cell.font = font16Bold;
    }
  }

  for (let i = 0; i < rowsToRender; i++) {
    const student = data.students[i];
    const row = i + 4;
    sheet4.getCell(row, 1).value = i + 1;
    sheet4.getCell(row, 1).alignment = centerAlign;

    const attrs = student ? data.attributes[student.id] || {} : {};
    const avg1 = getAvg(["attr1_1", "attr1_2", "attr1_3", "attr1_4"], attrs);
    const avg2 = getAvg(["attr2_1", "attr2_2"], attrs);
    const avg3 = getAvg(["attr3_1"], attrs);
    const avg4 = getAvg(["attr4_1", "attr4_2"], attrs);

    let c = 2;
    sheet4.getCell(row, c++).value = attrs.attr1_1 ?? "";
    sheet4.getCell(row, c++).value = attrs.attr1_2 ?? "";
    sheet4.getCell(row, c++).value = attrs.attr1_3 ?? "";
    sheet4.getCell(row, c++).value = attrs.attr1_4 ?? "";
    sheet4.getCell(row, c++).value = avg1;
    sheet4.getCell(row, c++).value = avg1;

    sheet4.getCell(row, c++).value = attrs.attr2_1 ?? "";
    sheet4.getCell(row, c++).value = attrs.attr2_2 ?? "";
    sheet4.getCell(row, c++).value = avg2;
    sheet4.getCell(row, c++).value = avg2;

    sheet4.getCell(row, c++).value = attrs.attr3_1 ?? "";
    sheet4.getCell(row, c++).value = avg3;
    sheet4.getCell(row, c++).value = avg3;

    sheet4.getCell(row, c++).value = attrs.attr4_1 ?? "";
    sheet4.getCell(row, c++).value = attrs.attr4_2 ?? "";
    sheet4.getCell(row, c++).value = avg4;
    sheet4.getCell(row, c++).value = avg4;

    for (let col = 1; col <= 18; col++) {
      const cell = sheet4.getCell(row, col);
      cell.border = borderThin;
      cell.font = font16;
      cell.alignment = centerAlign;

      // Apply orange fill to average columns
      if ([6, 7, 10, 11, 13, 14, 17, 18].includes(col)) {
        cell.fill = fillOrange;
      }
    }
  }

  // --- Sheet 5: คุณลักษณะ5-8 (Landscape) ---
  const sheet5 = workbook.addWorksheet("คุณลักษณะ5-8", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  sheet5.getColumn(1).width = 10;
  for (let i = 2; i <= 20; i++) {
    sheet5.getColumn(i).width = 6.5;
  }
  sheet5.getRow(3).height = 120;

  sheet5.mergeCells("A1:A3");
  sheet5.getCell("A1").value =
    "เลขที่/ภาคเรียนที่/ระดับคุณภาพ/ตัวชี้วัดคุณลักษณะ";
  sheet5.getCell("A1").alignment = verticalAlign;

  sheet5.mergeCells("B1:T1");
  sheet5.getCell("B1").value = "แบบบันทึกผลการประเมินคุณลักษณะอันพึงประสงค์";
  sheet5.getCell("B1").alignment = centerAlign;

  sheet5.mergeCells("B2:E2");
  sheet5.getCell("B2").value = "5. อยู่อย่างพอเพียง";
  sheet5.mergeCells("F2:I2");
  sheet5.getCell("F2").value = "6. มุ่งมั่นในการทำงาน";
  sheet5.mergeCells("J2:N2");
  sheet5.getCell("J2").value = "7. รักความเป็นไทย";
  sheet5.mergeCells("O2:R2");
  sheet5.getCell("O2").value = "8. มีจิตสาธารณะ";
  sheet5.mergeCells("S2:T2");
  sheet5.getCell("S2").value = "สรุประดับคุณภาพ";

  const sheet5HeadersRow3 = [
    "5.1 ดำเนินชีวิตอย่างพอประมาณ มีเหตุผล รอบคอบ มีคุณธรรม",
    "5.2 มีภูมิคุ้มกันในตัวที่ดี ปรับตัวเพื่ออยู่ในสังคมได้อย่างมีความสุข",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
    "6.1 ตั้งใจและรับผิดชอบในการปฏิบัติหน้าที่การงาน",
    "6.2 ทำงานด้วยความเพียรพยายามและอดทนเพื่อให้งานสำเร็จตามเป้าหมาย",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
    "7.1 ภาคภูมิใจในขนบธรรมเนียมประเพณี ศิลปะ วัฒนธรรมไทยและมีความกตัญญูกตเวที",
    "7.2 เห็นคุณค่าและใช้ภาษาไทยในการสื่อสารได้อย่างถูกต้องเหมาะสม",
    "7.3 อนุรักษ์และสืบทอดภูมิปัญญาไทย",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
    "8.1 ช่วยเหลือผู้อื่นด้วยความเต็มใจโดยไม่หวังผลตอบแทน",
    "8.2 เข้าร่วมกิจกรรมที่เป็นประโยชน์ต่อโรงเรียน ชุมชน และสังคม",
    "ผลการประเมิน",
    "รายคุณลักษณะ",
    "รวมทุกคุณลักษณะภาคเรียนที่ 2",
    "ผลการตัดสินคุณลักษณะรายปี\n(ดีเยี่ยม ดี ผ่าน ไม่ผ่าน)",
  ];

  sheet5HeadersRow3.forEach((header, index) => {
    const cell = sheet5.getCell(3, index + 2);
    cell.value = header;
    cell.alignment = verticalAlign;
  });

  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 20; c++) {
      const cell = sheet5.getCell(r, c);
      cell.fill = fillOrange;
      cell.border = borderThin;
      cell.font = font16Bold;
    }
  }

  for (let i = 0; i < rowsToRender; i++) {
    const student = data.students[i];
    const row = i + 4;
    sheet5.getCell(row, 1).value = i + 1;
    sheet5.getCell(row, 1).alignment = centerAlign;

    const attrs = student ? data.attributes[student.id] || {} : {};
    const avg1 = getAvg(["attr1_1", "attr1_2", "attr1_3", "attr1_4"], attrs);
    const avg2 = getAvg(["attr2_1", "attr2_2"], attrs);
    const avg3 = getAvg(["attr3_1"], attrs);
    const avg4 = getAvg(["attr4_1", "attr4_2"], attrs);
    const avg5 = getAvg(["attr5_1", "attr5_2"], attrs);
    const avg6 = getAvg(["attr6_1", "attr6_2"], attrs);
    const avg7 = getAvg(["attr7_1", "attr7_2", "attr7_3"], attrs);
    const avg8 = getAvg(["attr8_1", "attr8_2"], attrs);

    const totalAvg = Math.round(
      (avg1 + avg2 + avg3 + avg4 + avg5 + avg6 + avg7 + avg8) / 8,
    );

    let gradeText = "ไม่ผ่าน";
    let gradeStyle = styleFail as any;
    if (totalAvg === 3) {
      gradeText = "ดีเยี่ยม";
      gradeStyle = styleGood;
    } else if (totalAvg === 2) {
      gradeText = "ดี";
      gradeStyle = styleGood;
    } else if (totalAvg === 1) {
      gradeText = "ผ่าน";
      gradeStyle = stylePass;
    }

    let c = 2;
    sheet5.getCell(row, c++).value = attrs.attr5_1 ?? "";
    sheet5.getCell(row, c++).value = attrs.attr5_2 ?? "";
    sheet5.getCell(row, c++).value = avg5;
    sheet5.getCell(row, c++).value = avg5;

    sheet5.getCell(row, c++).value = attrs.attr6_1 ?? "";
    sheet5.getCell(row, c++).value = attrs.attr6_2 ?? "";
    sheet5.getCell(row, c++).value = avg6;
    sheet5.getCell(row, c++).value = avg6;

    sheet5.getCell(row, c++).value = attrs.attr7_1 ?? "";
    sheet5.getCell(row, c++).value = attrs.attr7_2 ?? "";
    sheet5.getCell(row, c++).value = attrs.attr7_3 ?? "";
    sheet5.getCell(row, c++).value = avg7;
    sheet5.getCell(row, c++).value = avg7;

    sheet5.getCell(row, c++).value = attrs.attr8_1 ?? "";
    sheet5.getCell(row, c++).value = attrs.attr8_2 ?? "";
    sheet5.getCell(row, c++).value = avg8;
    sheet5.getCell(row, c++).value = avg8;

    sheet5.getCell(row, c++).value = totalAvg;
    sheet5.getCell(row, c).value = gradeText;

    for (let col = 1; col <= 20; col++) {
      const cell = sheet5.getCell(row, col);
      cell.border = borderThin;
      cell.font = font16;
      cell.alignment = centerAlign;

      // Apply orange fill to average columns
      if ([4, 5, 8, 9, 13, 14, 17, 18, 19].includes(col)) {
        cell.fill = fillOrange;
      }

      // Apply specific style to the last column
      if (col === 20) {
        cell.font = gradeStyle.font;
        cell.fill = gradeStyle.fill;
      }
    }
  }

  // --- Sheet 6: คิดวิเคราะห์ (Landscape) ---
  const sheet6 = workbook.addWorksheet("คิดวิเคราะห์", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  sheet6.getColumn(1).width = 15;
  for (let i = 2; i <= 8; i++) {
    sheet6.getColumn(i).width = 6;
  }
  sheet6.getColumn(9).width = 12;
  sheet6.getColumn(10).width = 18;

  // Row 1
  sheet6.getCell("A1").value = "ชั้นที่ประเมิน";
  sheet6.getCell("A1").alignment = centerAlign;
  sheet6.mergeCells("B1:J1");
  sheet6.getCell("B1").value = "ประเมินตัวชี้วัดชั้น ม.1-3";
  sheet6.getCell("B1").alignment = centerAlign;

  // Row 2-8
  sheet6.mergeCells("A2:A8");
  sheet6.getCell("A2").value = "ตัวชี้วัด";
  sheet6.getCell("A2").alignment = centerAlign;

  const indicatorsText = [
    "1. อ่านออกเสียงให้ถูกต้องตามหลักการอ่าน",
    "2. อ่านแล้วจับใจความได้",
    "3. สรุป/แสดงความคิดเห็นในเรื่องที่เรียนได้",
    "4. แยกข้อเท็จจริงและข้อคิดเห็นในเรื่องที่เรียนได้",
    "5. เขียนสื่อความได้ตรงประเด็น",
    "6. เขียนแสดงความคิดเห็นได้ถูกต้อง",
    "7. เขียนสะกดคำได้ถูกต้องตามหลักภาษาไทย",
  ];

  indicatorsText.forEach((text, idx) => {
    const row = idx + 2;
    sheet6.mergeCells(`B${row}:J${row}`);
    sheet6.getCell(`B${row}`).value = text;
    sheet6.getCell(`B${row}`).alignment = leftAlign;
    sheet6.getCell(`B${row}`).font = fontStyle; // font-normal
  });

  // Row 9
  sheet6.getCell("A9").value = "ภาคเรียน";
  sheet6.getCell("A9").alignment = centerAlign;
  sheet6.mergeCells("B9:H9");
  sheet6.getCell("B9").value =
    `ภาคเรียนที่ ${data.generalInfo?.semester || "2"}`;
  sheet6.getCell("B9").alignment = centerAlign;
  sheet6.mergeCells("I9:I10");
  sheet6.getCell("I9").value = "สรุปผลการ\nประเมิน";
  sheet6.getCell("I9").alignment = centerWrap;
  sheet6.mergeCells("J9:J10");
  sheet6.getCell("J9").value = "สรุปผลการประเมิน\nปลายปี";
  sheet6.getCell("J9").alignment = centerWrap;

  // Row 10
  sheet6.getCell("A10").value = "ตัวชี้วัด";
  sheet6.getCell("A10").alignment = centerAlign;
  for (let i = 1; i <= 7; i++) {
    sheet6.getCell(10, i + 1).value = i;
    sheet6.getCell(10, i + 1).alignment = centerAlign;
  }

  // Row 11
  sheet6.getCell("A11").value = "ระดับคุณภาพ";
  sheet6.getCell("A11").alignment = centerAlign;
  for (let i = 1; i <= 8; i++) {
    sheet6.getCell(11, i + 1).value = "3";
    sheet6.getCell(11, i + 1).alignment = centerAlign;
  }
  sheet6.getCell("J11").value = "(ดีเยี่ยม ดี ผ่าน ไม่ผ่าน)";
  sheet6.getCell("J11").alignment = centerAlign;
  sheet6.getCell("J11").font = fontStyle; // font-normal

  // Apply styles to header (Rows 1-11)
  for (let r = 1; r <= 11; r++) {
    for (let c = 1; c <= 10; c++) {
      const cell = sheet6.getCell(r, c);
      cell.border = borderThin;
      cell.fill = fillOrange;
      if (!cell.font) cell.font = fontBold;
    }
  }

  // Data rows
  const analyticalRowsToRender = Math.max(data.students.length, 30);
  for (let i = 0; i < analyticalRowsToRender; i++) {
    const student = data.students[i];
    const row = i + 12;

    sheet6.getCell(`A${row}`).value = i + 1;
    sheet6.getCell(`A${row}`).alignment = centerAlign;
    sheet6.getCell(`A${row}`).border = borderThin;

    if (student) {
      const attrs = data.analytical?.[student.id] || {};

      // Attributes 1-7
      for (let j = 1; j <= 7; j++) {
        const val = attrs[`attr${j}`];
        sheet6.getCell(row, j + 1).value =
          val !== undefined && val !== "" ? Number(val) : "";
        sheet6.getCell(row, j + 1).alignment = centerAlign;
        sheet6.getCell(row, j + 1).border = borderThin;
      }

      // Avg
      const avg = getAvg(
        ["attr1", "attr2", "attr3", "attr4", "attr5", "attr6", "attr7"],
        attrs,
      );
      sheet6.getCell(`I${row}`).value =
        attrs["attr1"] !== undefined && attrs["attr1"] !== "" ? avg : "";
      sheet6.getCell(`I${row}`).alignment = centerAlign;
      sheet6.getCell(`I${row}`).border = borderThin;

      // Grade
      let gradeText = "";
      let gradeStyleToUse = null;
      if (attrs["attr1"] !== undefined && attrs["attr1"] !== "") {
        if (avg === 3) {
          gradeText = "ดีเยี่ยม";
          gradeStyleToUse = styleGood;
        } else if (avg === 2) {
          gradeText = "ดี";
          gradeStyleToUse = styleGood;
        } else if (avg === 1) {
          gradeText = "ผ่าน";
          gradeStyleToUse = styleGood;
        } else {
          gradeText = "ไม่ผ่าน";
          gradeStyleToUse = styleFail;
        }
      }

      sheet6.getCell(`J${row}`).value = gradeText;
      sheet6.getCell(`J${row}`).alignment = centerAlign;
      sheet6.getCell(`J${row}`).border = borderThin;

      if (gradeStyleToUse) {
        sheet6.getCell(`J${row}`).font = gradeStyleToUse.font;
        sheet6.getCell(`J${row}`).fill = gradeStyleToUse.fill;
      }
    } else {
      for (let c = 2; c <= 10; c++) {
        sheet6.getCell(row, c).value = "";
        sheet6.getCell(row, c).border = borderThin;
      }
    }
  }

  // --- Sheet 7: ตัวชี้วัด (Landscape) ---
  const sheet7 = workbook.addWorksheet("ตัวชี้วัด", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  sheet7.getColumn(1).width = 18; // A
  sheet7.getColumn(2).width = 12; // B
  sheet7.getColumn(3).width = 9; // C
  sheet7.getColumn(4).width = 9; // D
  sheet7.getColumn(5).width = 10; // E
  sheet7.getColumn(6).width = 12; // F
  sheet7.getColumn(7).width = 9; // G
  sheet7.getColumn(8).width = 9; // H
  sheet7.getColumn(9).width = 10; // I
  sheet7.getColumn(10).width = 12; // J
  sheet7.getColumn(11).width = 9; // K

  sheet7.mergeCells("A1:K1");
  sheet7.getCell("A1").value =
    "ตัวชี้วัด/ผลการเรียนรู้ ตามสาระและมาตรฐานการเรียนรู้";
  sheet7.getCell("A1").alignment = centerAlign;
  sheet7.getCell("A1").font = fontBold;
  sheet7.getCell("A1").fill = fillOrange;

  sheet7.getCell("A2").value = "กลุ่มสาระการเรียนรู้";
  sheet7.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };
  sheet7.getCell("A2").font = fontBold;

  sheet7.mergeCells("B2:D2");
  sheet7.getCell("B2").value = data.generalInfo?.learningArea || "";
  sheet7.getCell("B2").alignment = { horizontal: "left", vertical: "middle" };

  sheet7.getCell("E2").value = "รายวิชา";
  sheet7.getCell("E2").alignment = { horizontal: "right", vertical: "middle" };
  sheet7.getCell("E2").font = fontBold;
  sheet7.getCell("E2").fill = fillOrange;

  sheet7.mergeCells("F2:H2");
  sheet7.getCell("F2").value = data.generalInfo?.subjectName || "";
  sheet7.getCell("F2").alignment = { horizontal: "left", vertical: "middle" };

  sheet7.getCell("I2").value = "รหัสวิชา";
  sheet7.getCell("I2").alignment = { horizontal: "right", vertical: "middle" };
  sheet7.getCell("I2").font = fontBold;
  sheet7.getCell("I2").fill = fillOrange;

  sheet7.mergeCells("J2:K2");
  sheet7.getCell("J2").value = data.generalInfo?.subjectCode || "";
  sheet7.getCell("J2").alignment = { horizontal: "left", vertical: "middle" };

  let currentRow = 4;
  data.indicators.forEach((ind: any) => {
    sheet7.getCell(`A${currentRow}`).value = ind.id;
    sheet7.getCell(`A${currentRow}`).alignment = {
      horizontal: "left",
      vertical: "top",
    };
    sheet7.getCell(`A${currentRow}`).font = fontStyle;

    sheet7.mergeCells(`B${currentRow}:K${currentRow}`);
    sheet7.getCell(`B${currentRow}`).value = ind.description;
    sheet7.getCell(`B${currentRow}`).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };
    sheet7.getCell(`B${currentRow}`).font = fontStyle;

    currentRow++;
  });

  currentRow += 2;
  sheet7.mergeCells(`A${currentRow}:K${currentRow}`);
  sheet7.getCell(`A${currentRow}`).value =
    `ตัวชี้วัดรวม.........${data.indicators.length}.........ตัวชี้วัด`;
  sheet7.getCell(`A${currentRow}`).alignment = {
    horizontal: "left",
    vertical: "middle",
  };
  sheet7.getCell(`A${currentRow}`).font = fontBold;

  // Apply thick black border to A1:K50
  const maxRow = Math.max(50, currentRow + 2);
  const thickBorder = { style: "thick", color: { argb: "FF000000" } };

  for (let r = 1; r <= maxRow; r++) {
    for (let c = 1; c <= 11; c++) {
      const cell = sheet7.getCell(r, c);
      let border: any = { ...(cell.border || {}) };
      if (r === 1) border.top = thickBorder;
      if (r === maxRow) border.bottom = thickBorder;
      if (c === 1) border.left = thickBorder;
      if (c === 11) border.right = thickBorder;

      if (Object.keys(border).length > 0) {
        cell.border = border;
      }
    }
  }

  // --- Sheet 8: คำชี้แจง1 (Landscape) ---
  const sheet8 = workbook.addWorksheet("คำชี้แจง1", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  sheet8.getColumn(1).width = 5;
  sheet8.getColumn(2).width = 5;
  sheet8.getColumn(3).width = 5;
  sheet8.getColumn(4).width = 5;
  sheet8.getColumn(5).width = 5;
  sheet8.getColumn(6).width = 5;
  sheet8.getColumn(7).width = 5;
  sheet8.getColumn(8).width = 5;
  sheet8.getColumn(9).width = 5;
  sheet8.getColumn(10).width = 5;
  sheet8.getColumn(11).width = 15;
  sheet8.getColumn(12).width = 20;

  sheet8.getCell("A2").value = "การบันทึกเวลาเรียน";
  sheet8.getCell("A2").font = fontBold;
  sheet8.getCell("B3").value =
    "1. เลขประจำตัวนักเรียน ให้กรอกเลขประจำตัวนักเรียนเรียงจากน้อยไปหามาก โดยเริ่มจากนักเรียนชายทั้งหมด";
  sheet8.getCell("C4").value =
    "แล้วต่อด้วยนักเรียนหญิง ให้ยึดตามข้อมูล 10 มิถุนายนของทุกปี กรณีที่นักเรียนย้ายมาระหว่างปีการศึกษา";
  sheet8.getCell("C5").value =
    "ให้เพิ่มชื่อต่อจากคนสุดท้ายตามลำดับก่อนหลังวันที่ย้ายเข้ามาเรียน";
  sheet8.getCell("B6").value = "2. กรอกเลขประจำตัวประชาชน 13 หลัก ให้ถูกต้อง";
  sheet8.getCell("B7").value =
    "3. ชื่อ - ชื่อสกุล ให้กรอกชื่อและนามสกุลให้ชัดเจน";
  sheet8.getCell("B8").value =
    "4. ชั่วโมง สัปดาห์หนึ่งกำหนดไว้ 6 ช่อง คือ 6 วัน";
  sheet8.getCell("B9").value =
    "5. การบันทึกเวลาเรียน ให้บันทึกรายละเอียดดังนี้";
  sheet8.getCell("C10").value =
    "5.1 จำนวนชั่วโมงที่......... ให้เขียน 1,2,3 ........ ถ้าสอนมากกว่า 1 ชั่วโมงในเวลาเดียวกันให้เขียน";
  sheet8.getCell("D11").value =
    "1-2,3-4 หรือ 1 - 3, 4 - 6 ฯลฯ หรืออาจบันทึกแยกแต่ละชั่วโมงก็ได้";
  sheet8.getCell("C12").value =
    "5.2 ให้เขียนเครื่องหมาย [ ] ด้วยสีแดง สำหรับผู้ไม่มาเรียน เมื่อภายหลังผู้มาเรียนนำใบลาป่วยหรือ";
  sheet8.getCell("D13").value =
    'ใบลากิจมาแสดง ให้เขียน "ป" หรือ "ล" ลงใน แล้วแต่กรณี ส่วนผู้ที่มาเรียนให้ใส่เครื่องหมายใด / ลงในช่อง';
  sheet8.getCell("C14").value =
    "5.3 ถ้าผู้เรียนลาพักการเรียน ย้ายหรือลาออกระหว่างปี/ภาค ให้ขีดเส้นด้วยหมึกแดง ตั้งแต่ วันพักการเรียน";
  sheet8.getCell("D15").value =
    "ถึงวันสุดท้ายที่ถูกพักการเรียน หรือ ขีดตั้งแต่ลาออกจนถึงวันสิ้นปี/ภาคเรียน";
  sheet8.getCell("D16").value =
    'แล้วเขียนคำว่า "พักการเรียน" หรือ "ย้ายสถานศึกษา" แล้วแต่กรณี';
  sheet8.getCell("C17").value =
    "5.4 รวมจำนวนชั่วโมงเรียน เมื่อสิ้นปี/ภาค ให้รวมเวลามาเรียนจริงของผู้เรียนลงในช่องรวมเวลาเรียน";
  sheet8.getCell("D18").value =
    "แล้วกรอกเวลาเรียนเต็มและเวลาเรียน 80 เปอร์เซ็นต์ ของวิชานั้น ๆ นักเรียนที่มีเวลาเรียน";
  sheet8.getCell("D19").value =
    'ไม่ถึง 80 เปอร์เซ็นต์ของรายวิชานั้นให้เขียนด้วยหมึกสีแดงในช่องสรุปผลการประเมิน "มส"';
  sheet8.getCell("D19").font = {
    name: "TH Sarabun PSK",
    size: 16,
    color: { argb: "FFFF0000" },
  }; // Red color for "มส"

  sheet8.getCell("A21").value = "การบันทึกการประเมินผลการเรียน";
  sheet8.getCell("A21").font = fontBold;
  sheet8.getCell("B22").value = "1. ให้เขียนตัวชี้วัดจากข้อ1 ถึงข้อสุดท้าย";
  sheet8.getCell("B23").value =
    "2. เขียนอัตราส่วนคะแนนระหว่างเรียนและปลายปี/ภาค";
  sheet8.getCell("B24").value =
    "3. การบันทึกผลการเรียนระหว่างเรียน มีรายละเอียดดังนี้";
  sheet8.getCell("C25").value =
    "3.1 ให้เขียนเลขข้อของตัวชี้วัด และน้ำหนักคะแนนของแต่ละข้อลงใต้ช่อง";
  sheet8.getCell("C26").value =
    "ตัวชี้วัด/คะแนน เพื่อให้ทราบว่าการประเมินแต่ละครั้งจะประเมินข้อใด ดังตัวอย่าง";

  // Table 1
  sheet8.mergeCells("B28:K28");
  sheet8.getCell("B28").value = "คะแนนวัดผลระหว่างเรียน";
  sheet8.getCell("B28").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("B28").font = fontBold;
  sheet8.getCell("B28").border = borderThin;
  sheet8.getCell("L28").border = {
    top: { style: "thin" },
    right: { style: "thin" },
    bottom: { style: "thin" },
  };

  sheet8.mergeCells("B29:K29");
  sheet8.getCell("B29").value = "ตัวชี้วัด/คะแนน";
  sheet8.getCell("B29").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("B29").font = fontBold;
  sheet8.getCell("B29").border = borderThin;
  sheet8.getCell("L29").value = "รวมคะแนน";
  sheet8.getCell("L29").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L29").font = fontBold;
  sheet8.getCell("L29").border = borderThin;

  const table1Row1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  table1Row1.forEach((val, idx) => {
    const cell = sheet8.getCell(30, idx + 2);
    cell.value = val;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });
  sheet8.getCell("L30").value = "ระหว่างเรียน";
  sheet8.getCell("L30").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L30").border = borderThin;

  const table1Row2 = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
  table1Row2.forEach((val, idx) => {
    const cell = sheet8.getCell(31, idx + 2);
    cell.value = val;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });
  sheet8.getCell("L31").value = 80;
  sheet8.getCell("L31").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L31").border = borderThin;

  sheet8.getCell("C33").value =
    "3.2 วิธีการกรอกคะแนนตามที่นักเรียนได้จริงเมื่อประเมินแล้วผู้เรียนไม่ผ่านในแต่ละข้อ";
  sheet8.getCell("D34").value =
    "ต้องสอนซ่อมเสริมให้ (เจตนารมณ์ของการสอนซ่อมเสริม คือให้ผู้เรียนมีความรู้ความสามารถตาม";
  sheet8.getCell("D35").value =
    "เกณฑ์ของแต่ละข้อในตัวชี้วัด เมื่อประเมินแก้ตัวแล้วผู้เรียนได้คะแนนเกินครึ่ง)";
  sheet8.getCell("D36").value =
    "ของคะแนนเดิมให้ปรับเหลือเท่าครึ่งหนึ่งของคะแนนในแต่ละข้อ ดังตัวอย่าง";

  // Table 2
  sheet8.mergeCells("B38:K38");
  sheet8.getCell("B38").value = "คะแนนวัดผลระหว่างเรียน";
  sheet8.getCell("B38").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("B38").font = fontBold;
  sheet8.getCell("B38").border = borderThin;
  sheet8.getCell("L38").border = {
    top: { style: "thin" },
    right: { style: "thin" },
    bottom: { style: "thin" },
  };

  sheet8.mergeCells("B39:K39");
  sheet8.getCell("B39").value = "ตัวชี้วัด/คะแนน";
  sheet8.getCell("B39").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("B39").font = fontBold;
  sheet8.getCell("B39").border = borderThin;
  sheet8.getCell("L39").value = "รวมคะแนน";
  sheet8.getCell("L39").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L39").font = fontBold;
  sheet8.getCell("L39").border = borderThin;

  const table2Row1 = [1, 3, 4, 5, 6, "", "", "", "", ""];
  table2Row1.forEach((val, idx) => {
    const cell = sheet8.getCell(40, idx + 2);
    cell.value = val;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });
  sheet8.getCell("L40").value = "ระหว่างเรียน";
  sheet8.getCell("L40").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L40").border = borderThin;

  const table2Row2 = [4, 6, 5, 5, 10, "", "", "", "", ""];
  table2Row2.forEach((val, idx) => {
    const cell = sheet8.getCell(41, idx + 2);
    cell.value = val;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });
  sheet8.getCell("L41").value = 80;
  sheet8.getCell("L41").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L41").border = borderThin;

  const table2Row3 = [2, "2/3", 3, 4, 6, "", "", "", "", ""];
  table2Row3.forEach((val, idx) => {
    const cell = sheet8.getCell(42, idx + 2);
    cell.value = val;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });
  sheet8.getCell("L42").value = 18;
  sheet8.getCell("L42").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L42").border = borderThin;

  const table2Row4 = [3, 4, 4, "2/3", "4/5", "", "", "", "", ""];
  table2Row4.forEach((val, idx) => {
    const cell = sheet8.getCell(43, idx + 2);
    cell.value = val;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });
  sheet8.getCell("L43").value = 19;
  sheet8.getCell("L43").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet8.getCell("L43").border = borderThin;

  // Add thick border around the content in sheet8
  const lastRowSheet8 = 45;
  for (let r = 1; r <= lastRowSheet8; r++) {
    for (let c = 1; c <= 13; c++) {
      const cell = sheet8.getCell(r, c);
      let border: any = cell.border || {};

      if (r === 1) border.top = { style: "thick" };
      if (r === lastRowSheet8) border.bottom = { style: "thick" };
      if (c === 1) border.left = { style: "thick" };
      if (c === 13) border.right = { style: "thick" };

      if (Object.keys(border).length > 0) {
        cell.border = border;
      }
    }
  }

  // --- Sheet 9: คำชี้แจง2 (Landscape) ---
  const sheet9 = workbook.addWorksheet("คำชี้แจง2", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  sheet9.getColumn(1).width = 5;
  sheet9.getColumn(2).width = 5;
  sheet9.getColumn(3).width = 5;
  sheet9.getColumn(4).width = 5;
  sheet9.getColumn(5).width = 5;
  sheet9.getColumn(6).width = 5;
  sheet9.getColumn(7).width = 5;
  sheet9.getColumn(8).width = 5;
  sheet9.getColumn(9).width = 5;
  sheet9.getColumn(10).width = 5;
  sheet9.getColumn(11).width = 15;
  sheet9.getColumn(12).width = 20;

  sheet9.getCell("A2").value = "การบันทึกการวัดและประเมินผล";
  sheet9.getCell("A2").font = fontBold;
  sheet9.getCell("B3").value = "1) วิธีการกรอกคะแนน";
  sheet9.getCell("C4").value =
    "1.1 สำหรับคะแนนวัดผลการเรียนรู้นักเรียนคนใดเมื่อทดสอบแล้วไม่ผ่านเกณฑ์ให้มีการสอนซ่อมเสริม";
  sheet9.getCell("D5").value =
    "ในจุดที่ไม่ผ่านเกณฑ์แล้วให้สอบแก้ตัว คะแนนเดิมที่ได้ใหม่ต้องไม่เกินครึ่งหนึ่งของคะแนนทั้งหมด";
  sheet9.getCell("C6").value =
    "1.2 ให้รวมคะแนนระหว่างภาคเรียนเข้าด้วยกันแล้วเขียนลงในช่องรวมคะแนนระหว่างเรียน";
  sheet9.getCell("C7").value =
    "1.3 เขียนคะแนนสอบปลายภาคเรียนลงในช่องรวมคะแนนสอบปลายภาค";
  sheet9.getCell("C8").value =
    "1.4 รวมคะแนนระหว่างเรียนและรวมคะแนนสอบปลายภาคแล้วนำมาเทียบกับเกณฑ์ที่กำหนดไว้";
  sheet9.getCell("D9").value = "เพื่อให้ระดับผลการเรียน";
  sheet9.getCell("C10").value =
    '1.5 นักเรียนที่มีเวลาเรียนไม่ครบ 80% ไม่มีสิทธิ์เข้าสอบปลายภาคให้ได้ "มส"';
  sheet9.getCell("C11").value =
    '1.6 นักเรียนที่มีเวลาเรียนครบ 80% แต่ไม่ได้เข้าสอบปลายภาคหรือผู้ที่ส่งงานไม่ครบให้ได้ผลการเรียนเป็น "ร"';

  sheet9.getCell("B13").value =
    '2) การกรอกคะแนนผลการเรียนใช้หมึกสีน้ำเงินหรือสีดำ ยกเว้น "0" ,"ร" , " มส" , "มผ" ให้ใช้หมึกสีแดง';
  sheet9.getCell("B14").value =
    "3) หากมีการแก้ไขให้ใช้หมึกสีแดง ขีดฆ่าคำผิด และเขียนคำที่ถูกต้องพร้อมลงชื่อกำกับด้วยหมึกสีแดง";
  sheet9.getCell("C15").value =
    "และให้ใช้อักษรแสดงผลการเรียนที่มีเงื่อนไขในแต่ละรายวิชา ดังนี้";

  sheet9.getCell("D17").value = "ร";
  sheet9.getCell("E17").value = "หมายถึง";
  sheet9.getCell("G17").value = "รอการตัดสิน หรือยังตัดสินไม่ได้เนื่องจาก";
  sheet9.getCell("G18").value = "1. ไม่ส่งงาน";
  sheet9.getCell("G19").value = "2. ไม่ผ่านการทดสอบตัวชี้วัด/ผลการเรียนรู้";

  sheet9.getCell("D20").value = "มส";
  sheet9.getCell("E20").value = "หมายถึง";
  sheet9.getCell("G20").value = "เข้าเรียนไม่ครบร้อยละ 80";

  sheet9.getCell("D21").value = "ผ";
  sheet9.getCell("E21").value = "หมายถึง";
  sheet9.getCell("G21").value = "ผ่านเกณฑ์การประเมิน";

  sheet9.getCell("D22").value = "มผ";
  sheet9.getCell("E22").value = "หมายถึง";
  sheet9.getCell("G22").value = "ไม่ผ่านเกณฑ์การประเมิน";

  sheet9.getCell("D24").value = "ระดับผลการเรียน";
  sheet9.getCell("D24").font = fontBold;

  // Table
  sheet9.mergeCells("D25:E25");
  sheet9.getCell("D25").value = "ระดับผลการเรียน";
  sheet9.getCell("D25").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet9.getCell("D25").border = borderThin;
  sheet9.getCell("E25").border = borderThin;

  sheet9.mergeCells("F25:H25");
  sheet9.getCell("F25").value = "ความหมาย";
  sheet9.getCell("F25").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet9.getCell("F25").border = borderThin;
  sheet9.getCell("G25").border = borderThin;
  sheet9.getCell("H25").border = borderThin;

  sheet9.mergeCells("I25:K25");
  sheet9.getCell("I25").value = "ช่วงคะแนนเป็นร้อยละ";
  sheet9.getCell("I25").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet9.getCell("I25").border = borderThin;
  sheet9.getCell("J25").border = borderThin;
  sheet9.getCell("K25").border = borderThin;

  const gradeData = [
    ["0", "ผลการเรียนต่ำกว่าเกณฑ์", "0 - 49"],
    ["1", "ผลการเรียนขั้นต่ำ", "50 - 54"],
    ["1.5", "ผลการเรียนพอใช้", "55 - 59"],
    ["2", "ผลการเรียนน่าพอใจ", "60 - 64"],
    ["2.5", "ผลการเรียนค่อนข้างดี", "65 - 69"],
    ["3", "ผลการเรียนดี", "70 - 74"],
    ["3.5", "ผลการเรียนดีมาก", "75 - 79"],
    ["4", "ผลการเรียนดีเยี่ยม", "80 - 100"],
  ];

  gradeData.forEach((row, idx) => {
    const r = 26 + idx;

    sheet9.mergeCells(`D${r}:E${r}`);
    sheet9.getCell(`D${r}`).value = row[0];
    sheet9.getCell(`D${r}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    sheet9.getCell(`D${r}`).border = borderThin;
    sheet9.getCell(`E${r}`).border = borderThin;

    sheet9.mergeCells(`F${r}:H${r}`);
    sheet9.getCell(`F${r}`).value = row[1];
    sheet9.getCell(`F${r}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    sheet9.getCell(`F${r}`).border = borderThin;
    sheet9.getCell(`G${r}`).border = borderThin;
    sheet9.getCell(`H${r}`).border = borderThin;

    sheet9.mergeCells(`I${r}:K${r}`);
    sheet9.getCell(`I${r}`).value = row[2];
    sheet9.getCell(`I${r}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    sheet9.getCell(`I${r}`).border = borderThin;
    sheet9.getCell(`J${r}`).border = borderThin;
    sheet9.getCell(`K${r}`).border = borderThin;
  });

  // Add thick border around the content in sheet9
  const lastRowSheet9 = 35;
  for (let r = 1; r <= lastRowSheet9; r++) {
    for (let c = 1; c <= 13; c++) {
      const cell = sheet9.getCell(r, c);
      let border: any = cell.border || {};

      if (r === 1) border.top = { style: "thick" };
      if (r === lastRowSheet9) border.bottom = { style: "thick" };
      if (c === 1) border.left = { style: "thick" };
      if (c === 13) border.right = { style: "thick" };

      if (Object.keys(border).length > 0) {
        cell.border = border;
      }
    }
  }

  // Final Font Application
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (!cell.font || cell.font.name !== "TH Sarabun PSK") {
          cell.font = fontStyle;
        }
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const subjectName = data.generalInfo?.subjectName || "รายวิชา";
  const gradeLevel = data.generalInfo?.gradeLevel || "ระดับชั้น";
  const formattedGrade = gradeLevel.replace("/", " ทับ ").replace("ม.", "ม. ");
  const fileName = `แบบปพ.5 ${subjectName} ${formattedGrade}.xlsx`;

  saveAs(blob, fileName);
};
