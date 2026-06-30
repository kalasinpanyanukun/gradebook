import React from "react";
import { applyPap5OfficialDisplayDefaults } from "../lib/pap5Officials";
import { AppData } from "../types";

interface Props {
  data: AppData["generalInfo"];
  appData: AppData;
  onChange: (data: AppData["generalInfo"]) => void;
}

const DEFAULT_SCHOOL_NAME = "โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์";
const DEFAULT_AGENCY_NAME = "สำนักบริหารงานการศึกษาพิเศษ";
const DEFAULT_LOGO_URL = "/logo3.png";
const LEGACY_LOGO_URL = "/logo1.png";

function buildHomeroomTeachersText(data: AppData["generalInfo"]): string {
  return [data.homeroomTeacher1, data.homeroomTeacher2, data.homeroomTeacher3]
    .map((name, index) => (name ? `${index + 1}. ${name}` : ""))
    .filter(Boolean)
    .join(" ");
}

export const GeneralInfoForm: React.FC<Props> = ({
  data,
  appData,
  onChange,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let newData = { ...data, [name]: value };

    if (name === "totalHours") {
      const hours = parseFloat(value) || 0;
      newData.hoursPerWeek = value;
      newData.hoursPerSemester = (hours * 20).toString();
    }

    if (
      name === "homeroomTeacher1" ||
      name === "homeroomTeacher2" ||
      name === "homeroomTeacher3"
    ) {
      newData.homeroomTeachers = buildHomeroomTeachersText(newData);
    }

    onChange(newData);
  };

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

  const summary = {
    totalStudents: appData.students.length,
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

  appData.students.forEach((student) => {
    // 1. Grades
    const score = appData.scores[student.id] || {};
    let totalBetweenTerm = 0;
    if (appData.scoreConfig?.units) {
      appData.scoreConfig.units.forEach((u, uIdx) => {
        u.indicators.forEach((ind, iIdx) => {
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
    const anal = appData.analytical[student.id] || {};
    const avgAnal = getAvg(
      ["attr1", "attr2", "attr3", "attr4", "attr5", "attr6", "attr7"],
      anal,
    );
    summary.analytical[avgAnal.toString() as keyof typeof summary.analytical]++;

    // 3. Attributes
    const attr = appData.attributes[student.id] || {};
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

  const schoolName = data.schoolName || DEFAULT_SCHOOL_NAME;
  const agencyName = data.agencyName || DEFAULT_AGENCY_NAME;
  const displayGeneralInfo = applyPap5OfficialDisplayDefaults(data);
  const logoUrl =
    data.logoUrl && data.logoUrl !== LEGACY_LOGO_URL
      ? data.logoUrl
      : DEFAULT_LOGO_URL;

  return (
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto">
      <div
        className="bg-white p-8 relative text-sm rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]"
        style={{ width: "794px", minHeight: "1123px", fontFamily: "Sarabun" }}
      >
        <div className="absolute top-8 right-8 font-bold text-sm">ปพ. 5</div>

        <div className="flex justify-center mb-2">
          <img
            src={logoUrl}
            alt="School Logo"
            className="w-24 h-24 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith(DEFAULT_LOGO_URL)) {
                target.src = DEFAULT_LOGO_URL;
              }
            }}
          />
        </div>

        <div className="text-center font-bold text-sm">
          แบบบันทึกผลการเรียนรายวิชา
        </div>
        <div className="text-center font-bold text-sm">
          ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551
        </div>
        <div className="text-center font-bold text-sm">{schoolName}</div>
        <div className="text-center font-bold text-sm mb-4">{agencyName}</div>

        <div className="flex justify-center items-center gap-2 mb-2">
          <span>ชั้นมัธยมศึกษาปีที่</span>
          <input
            type="text"
            name="gradeLevel"
            value={data.gradeLevel}
            onChange={handleChange}
            className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-20 text-center outline-none"
          />
          <span>ภาคเรียนที่</span>
          <select
            name="semester"
            value={data.semester}
            onChange={handleChange}
            className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-16 text-center outline-none cursor-pointer"
          >
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
          <span>ปีการศึกษา</span>
          <input
            type="text"
            name="academicYear"
            value={data.academicYear}
            onChange={handleChange}
            className="border-b border-slate-400 focus:border-blue-500 w-20 text-center outline-none"
          />
        </div>

        <div className="flex justify-center items-center gap-2 mb-2 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <span>รหัสวิชา</span>
            <input
              type="text"
              name="subjectCode"
              value={data.subjectCode}
              onChange={handleChange}
              className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-16 text-center outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <span>รายวิชา</span>
            <input
              type="text"
              name="subjectName"
              value={data.subjectName}
              onChange={handleChange}
              className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-40 text-center outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <span>กลุ่มสาระการเรียนรู้</span>
            <input
              type="text"
              name="learningArea"
              value={data.learningArea}
              onChange={handleChange}
              className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-56 text-center outline-none"
            />
          </div>
        </div>

        <div className="flex justify-center items-center gap-2 mb-2">
          <span>รวมเวลาเรียน</span>
          <input
            type="number"
            name="totalHours"
            value={data.totalHours}
            onChange={handleChange}
            className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-12 text-center outline-none"
          />
          <span>ชั่วโมง/สัปดาห์</span>
          <input
            type="text"
            readOnly
            value={data.hoursPerSemester}
            className="border-b border-slate-400 focus:border-blue-500 w-12 text-center outline-none bg-slate-50"
          />
          <span>ชั่วโมง/ภาคเรียน</span>
        </div>

        <div className="flex justify-center items-center gap-2 mb-2">
          <span>ครูผู้สอน 1.</span>
          <input
            type="text"
            name="teacherName"
            value={data.teacherName}
            onChange={handleChange}
            className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-48 text-center outline-none"
          />
          <span>2.</span>
          <input
            type="text"
            name="teacherName2"
            value={data.teacherName2 || ""}
            onChange={handleChange}
            className="bg-yellow-excel border-b border-slate-400 focus:border-blue-500 w-48 text-center outline-none"
          />
        </div>

        <div className="flex justify-center items-center gap-2 mb-4">
          <span>ครูประจำชั้น 1.</span>
          <input
            type="text"
            name="homeroomTeacher1"
            value={data.homeroomTeacher1}
            onChange={handleChange}
            className="border-b border-slate-400 focus:border-blue-500 w-36 text-center outline-none"
          />
          <span>2.</span>
          <input
            type="text"
            name="homeroomTeacher2"
            value={data.homeroomTeacher2}
            onChange={handleChange}
            className="border-b border-slate-400 focus:border-blue-500 w-36 text-center outline-none"
          />
          <span>3.</span>
          <input
            type="text"
            name="homeroomTeacher3"
            value={data.homeroomTeacher3 || ""}
            onChange={handleChange}
            className="border-b border-slate-400 focus:border-blue-500 w-36 text-center outline-none"
          />
        </div>

        {/* Summary Table */}
        <table className="excel-table mb-4 mx-auto w-[90%] [&_th]:text-[12px] [&_td]:text-[12px] [&_th]:p-1 [&_td]:p-1 [&_tr]:h-10">
          <thead>
            <tr>
              <th rowSpan={3} className="leading-tight">
                จำนวน
                <br />
                นักเรียน
                <br />
                ทั้งหมด
              </th>
              <th colSpan={15}>สรุปผลการเรียน</th>
            </tr>
            <tr>
              <th colSpan={8}>จำนวนนักเรียนที่ได้รับระดับผลการเรียน</th>
              <th colSpan={2}>สรุป</th>
              <th rowSpan={2}>รายงานการประเมิน</th>
              <th colSpan={4} className="text-[10px] leading-tight">
                จำนวนนักเรียนที่ได้รับระดับคุณภาพ
              </th>
            </tr>
            <tr>
              <th>4</th>
              <th>3.5</th>
              <th>3</th>
              <th>2.5</th>
              <th>2</th>
              <th>1.5</th>
              <th>1</th>
              <th>0</th>
              <th>ผ</th>
              <th>มผ</th>
              <th className="text-[10px] leading-tight">
                ดีเยี่ยม
                <br />
                (3)
              </th>
              <th className="text-[10px] leading-tight">
                ดี
                <br />
                (2)
              </th>
              <th className="text-[10px] leading-tight">
                ผ่าน
                <br />
                (1)
              </th>
              <th className="text-[10px] leading-tight">
                ไม่ผ่าน
                <br />
                (0)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{summary.totalStudents}</td>
              <td>{summary.grades["4"]}</td>
              <td>{summary.grades["3.5"]}</td>
              <td>{summary.grades["3"]}</td>
              <td>{summary.grades["2.5"]}</td>
              <td>{summary.grades["2"]}</td>
              <td>{summary.grades["1.5"]}</td>
              <td>{summary.grades["1"]}</td>
              <td>{summary.grades["0"]}</td>
              <td>{summary.grades["ผ"]}</td>
              <td>{summary.grades["มผ"]}</td>
              <td className="whitespace-nowrap text-[10px]">
                การอ่านคิดวิเคราะห์และเขียน
              </td>
              <td>{summary.analytical["3"]}</td>
              <td>{summary.analytical["2"]}</td>
              <td>{summary.analytical["1"]}</td>
              <td>{summary.analytical["0"]}</td>
            </tr>
            <tr>
              <td>%</td>
              <td>{getPercent(summary.grades["4"])}</td>
              <td>{getPercent(summary.grades["3.5"])}</td>
              <td>{getPercent(summary.grades["3"])}</td>
              <td>{getPercent(summary.grades["2.5"])}</td>
              <td>{getPercent(summary.grades["2"])}</td>
              <td>{getPercent(summary.grades["1.5"])}</td>
              <td>{getPercent(summary.grades["1"])}</td>
              <td>{getPercent(summary.grades["0"])}</td>
              <td>{summary.grades["ผ"]}</td>
              <td>{summary.grades["มผ"]}</td>
              <td className="whitespace-nowrap text-[10px]">
                คุณลักษณะอันพึงประสงค์
              </td>
              <td>{summary.attributes["3"]}</td>
              <td>{summary.attributes["2"]}</td>
              <td>{summary.attributes["1"]}</td>
              <td>{summary.attributes["0"]}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="px-8 space-y-5">
          <div className="font-bold">การอนุมัติผลการเรียน</div>

          <div className="flex items-end justify-center">
            <div className="w-24 text-right pr-2">ลงชื่อ</div>
            <div className="w-56 border-b border-dotted border-slate-500"></div>
            <div className="w-56 pl-2 text-left">ครูผู้สอน</div>
          </div>
          <div className="flex items-center justify-center -mt-4">
            <div className="w-24"></div>
            <div className="w-56 text-center">
              ({" "}
              {data.teacherName2
                ? `1. ${data.teacherName}  2. ${data.teacherName2}`
                : data.teacherName}{" "}
              )
            </div>
            <div className="w-56"></div>
          </div>

          <div className="flex items-end justify-center">
            <div className="w-24 text-right pr-2">ลงชื่อ</div>
            <div className="w-56 border-b border-dotted border-slate-500"></div>
            <div className="w-56 pl-2 text-left">
              หัวหน้ากลุ่มสาระการเรียนรู้
            </div>
          </div>
          <div className="flex items-center justify-center -mt-4">
            <div className="w-24"></div>
            <div className="w-56 text-center">
              ( {displayGeneralInfo.headOfLearningArea} )
            </div>
            <div className="w-56"></div>
          </div>

          <div className="flex items-end justify-center">
            <div className="w-24 text-right pr-2">ลงชื่อ</div>
            <div className="w-56 border-b border-dotted border-slate-500"></div>
            <div className="w-56 pl-2 text-left">หัวหน้างานวัดและประเมินผล</div>
          </div>
          <div className="flex items-center justify-center -mt-4">
            <div className="w-24"></div>
            <div className="w-56 text-center">( {displayGeneralInfo.headOfEvaluation} )</div>
            <div className="w-56"></div>
          </div>

          <div className="font-bold mt-6">เรียนเสนอเพื่อพิจารณา</div>

          <div className="flex items-end justify-center">
            <div className="w-24 text-right pr-2">ลงชื่อ</div>
            <div className="w-56 border-b border-dotted border-slate-500"></div>
            <div className="w-56 pl-2 text-left">รองผู้อำนวยการฝ่ายวิชาการ</div>
          </div>
          <div className="flex items-center justify-center -mt-4">
            <div className="w-24"></div>
            <div className="w-56 text-center">( {displayGeneralInfo.deputyDirector} )</div>
            <div className="w-56"></div>
          </div>

          <div className="flex justify-center gap-12 my-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 cursor-pointer" />
              <span>อนุมัติ</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 cursor-pointer" />
              <span>ไม่อนุมัติ</span>
            </label>
          </div>

          <div className="flex items-end justify-center">
            <div className="w-24 text-right pr-2">ลงชื่อ</div>
            <div className="w-56 border-b border-dotted border-slate-500"></div>
            <div className="w-56"></div>
          </div>
          <div className="flex items-center justify-center -mt-4">
            <div className="w-24"></div>
            <div className="w-56 text-center">( {data.schoolDirector} )</div>
            <div className="w-56"></div>
          </div>
          <div className="flex items-center justify-center -mt-4">
            <div className="w-24"></div>
            <div className="w-56 text-center whitespace-nowrap">
              ผู้อำนวยการ{schoolName}
            </div>
            <div className="w-56"></div>
          </div>
          <div className="flex items-center justify-center -mt-2">
            <div className="w-24"></div>
            <div className="w-56 flex justify-center">
              <input
                type="date"
                name="approvalDate"
                value={data.approvalDate}
                onChange={handleChange}
                className="border border-slate-300 rounded px-2 py-1 text-sm outline-none cursor-pointer text-center"
              />
            </div>
            <div className="w-56"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
