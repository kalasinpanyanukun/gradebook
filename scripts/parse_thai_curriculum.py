"""Parse Thai curriculum indicators using PDF column coordinates."""
from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import fitz

PDF = Path(__file__).resolve().parents[2] / "private_data" / "ksp-curriculum" / "๑. กลุ่มสาระการเรียนรู้ภาษาไทย.pdf"
OUT = Path(__file__).resolve().parents[1] / "src" / "data" / "curriculum" / "thai" / "thaiLanguageData.json"

THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
CODE_RE = re.compile(r"ท\s*(\d+)\.(\d+)\s*(ป|ม)\.?\s*(\d+)\s*/\s*(\d+)")
GRADE_RE = re.compile(r"^(ป|ม)\.(\d+)$")
STRAND_RE = re.compile(r"^สาระที่\s*(\d+)\s+(.+)")
STD_RE = re.compile(r"^มาตรฐาน\s+(ท\s*[\d.]+\s*[\d.]*)")

STANDARD_TEXT = {
    "ท 1.1": "ใช้กระบวนการอ่านสร้างความรู้และความคิดเพื่อนำไปใช้ตัดสินใจ แก้ปัญหาในการดำเนินชีวิต และมีนิสัยรักการอ่าน",
    "ท 2.1": "ใช้กระบวนการเขียนสื่อสาร เขียนเรียงความ ย่อความ และเขียนเรื่องราวในรูปแบบต่าง ๆ เขียนรายงานข้อมูลสารสนเทศและรายงานการศึกษาค้นคว้าอย่างมีประสิทธิภาพ",
    "ท 3.1": "สามารถเลือกฟังและดูอย่างมีวิจารณญาณ และพูดแสดงความรู้ ความคิด และความรู้สึก ในโอกาสต่าง ๆ อย่างมีวิจารณญาณและสร้างสรรค์",
    "ท 4.1": "เข้าใจธรรมชาติของภาษาและหลักภาษาไทย การเปลี่ยนแปลงของภาษาและพลังของภาษา ภูมิปัญญาทางภาษา และรักษาภาษาไทยไว้เป็นสมบัติของชาติ",
    "ท 5.1": "เข้าใจและแสดงความคิดเห็น วิจารณ์วรรณคดีและวรรณกรรมไทยอย่างเห็นคุณค่า และนำมาประยุกต์ใช้ในชีวิตจริง",
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).translate(THAI_DIGITS)
    return re.sub(r"\s+", " ", s).strip()


def norm_code(raw: str) -> str | None:
    m = CODE_RE.search(norm(raw))
    if not m:
        return None
    a, b, lv, g, n = m.groups()
    return f"ท {a}.{b} {lv}.{g}/{n}"


def column_for_x(x: float) -> str | None:
    if x < 120:
        return "grade"
    if x < 230:
        return "midway"
    if x < 390:
        return "exit"
    return "learning"


def page_spans(page: fitz.Page) -> list[tuple[float, float, str]]:
    items: list[tuple[float, float, str]] = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = norm(span.get("text", ""))
                if text:
                    x0, y0, _, _ = span["bbox"]
                    items.append((x0, y0, text))
    return items


def group_rows(spans: list[tuple[float, float, str]], y_tol: float = 8.0) -> list[list[tuple[float, float, str]]]:
    if not spans:
        return []
    sorted_spans = sorted(spans, key=lambda s: (s[1], s[0]))
    rows: list[list[tuple[float, float, str]]] = []
    current: list[tuple[float, float, str]] = []
    current_y: float | None = None
    for x, y, text in sorted_spans:
        if current_y is None or abs(y - current_y) <= y_tol:
            current.append((x, y, text))
            current_y = y if current_y is None else (current_y + y) / 2
        else:
            rows.append(current)
            current = [(x, y, text)]
            current_y = y
    if current:
        rows.append(current)
    return rows


def row_columns(row: list[tuple[float, float, str]]) -> dict[str, str]:
    cols: dict[str, list[str]] = defaultdict(list)
    for x, _, text in row:
        col = column_for_x(x)
        if col:
            cols[col].append(text)
    return {k: norm(" ".join(v)) for k, v in cols.items()}


def parse() -> list[dict]:
    doc = fitz.open(PDF)
    part4_start = None
    for i in range(len(doc)):
        if "ส่วนที่ 4" in doc[i].get_text():
            part4_start = i
            break
    if part4_start is None:
        part4_start = 0

    rows: list[dict] = []
    row_id = 0
    strand_no = 0
    strand_name = ""
    standard_code = ""
    current_grade = ""

    for page_index in range(part4_start, len(doc)):
        text = doc[page_index].get_text()
        if page_index > part4_start and "ส่วนที่ 5" in text:
            break

        spans = page_spans(doc[page_index])
        if not any("ตัวชี้วัด" in s[2] or CODE_RE.search(s[2]) for s in spans):
            # still parse strand/standard headers from full text lines
            for _, _, t in spans:
                m_strand = STRAND_RE.match(t)
                if m_strand:
                    strand_no = int(m_strand.group(1))
                    strand_name = norm(m_strand.group(2))
                m_std = STD_RE.match(t)
                if m_std:
                    code = norm_code(m_std.group(1) + " 1.1") or norm(m_std.group(1))
                    # fix standard code extraction
                    sm = re.search(r"ท\s*[\d.]+\s*[\d.]*", t)
                    if sm:
                        standard_code = norm(sm.group(0).replace(" ", " ").strip())
                        standard_code = re.sub(r"ท\s*(\d+)\.(\d+)", r"ท \1.\2", standard_code)
            continue

        for _, _, t in spans:
            m_strand = STRAND_RE.match(t)
            if m_strand:
                strand_no = int(m_strand.group(1))
                strand_name = norm(m_strand.group(2))
            if t.startswith("มาตรฐาน"):
                sm = re.search(r"ท\s*[\d.]+\s*[\d.]*", t)
                if sm:
                    raw = sm.group(0)
                    m = re.search(r"ท\s*(\d+)\.(\d+)", norm(raw))
                    if m:
                        standard_code = f"ท {m.group(1)}.{m.group(2)}"

        for row_spans in group_rows(spans):
            cols = row_columns(row_spans)
            grade_cell = cols.get("grade", "")
            g = GRADE_RE.match(grade_cell)
            if g:
                current_grade = f"{g.group(1)}.{g.group(2)}"

            midway = cols.get("midway", "")
            exit_ = cols.get("exit", "")
            learning = cols.get("learning", "")

            if not current_grade:
                continue
            if not midway and not exit_:
                continue
            if midway in {"-", "ชั้น", "ตัวชี้วัดระหว่างทาง"}:
                midway = ""
            if exit_ in {"-", "ตัวชี้วัดปลายทาง"}:
                exit_ = ""

            code = norm_code(midway) or norm_code(exit_)
            if not midway and not exit_:
                continue

            row_id += 1
            rows.append(
                {
                    "id": f"th-{current_grade}-{row_id}",
                    "subject": "ภาษาไทย",
                    "learningArea": "ภาษาไทย",
                    "gradeLevel": current_grade,
                    "strandNo": strand_no,
                    "strandName": strand_name,
                    "standardCode": standard_code,
                    "standardDescription": STANDARD_TEXT.get(standard_code, ""),
                    "indicatorCode": code or "",
                    "midwayIndicator": midway or None,
                    "exitIndicator": exit_ or None,
                    "learningAreaNote": learning or None,
                }
            )

    # merge continuation rows (text split across y rows in same column without new code)
    merged: list[dict] = []
    for row in rows:
        if merged and not norm_code(row.get("midwayIndicator", "") or "") and not norm_code(row.get("exitIndicator", "") or ""):
            prev = merged[-1]
            if prev["gradeLevel"] == row["gradeLevel"] and prev["standardCode"] == row["standardCode"]:
                for field in ("midwayIndicator", "exitIndicator", "learningAreaNote"):
                    if row.get(field):
                        prev[field] = norm(f"{prev.get(field) or ''} {row[field]}")
                continue
        merged.append(row)

    # attach code prefix if missing in column text
    for row in merged:
        code = norm_code(row.get("midwayIndicator", "") or "") or norm_code(row.get("exitIndicator", "") or "")
        if code:
            row["indicatorCode"] = code
            if row.get("midwayIndicator") and not norm_code(row["midwayIndicator"]):
                pass
            if row.get("exitIndicator") and code not in row["exitIndicator"]:
                if not row["exitIndicator"].startswith("ท"):
                    row["exitIndicator"] = f"{code} {row['exitIndicator']}"

    merged.sort(key=lambda r: (r["gradeLevel"], r["strandNo"], r["standardCode"], r.get("indicatorCode", "")))
    return merged


def main() -> None:
    rows = parse()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    from collections import Counter

    print(f"wrote {len(rows)} rows")
    print(dict(Counter(r["gradeLevel"] for r in rows)))


if __name__ == "__main__":
    main()
