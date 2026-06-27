"""Parse school curriculum PDF (midway/exit indicator tables)."""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import fitz

THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).translate(THAI_DIGITS)
    return re.sub(r"\s+", " ", s).strip()


def build_code_re(prefix: str) -> re.Pattern[str]:
    esc = re.escape(prefix)
    return re.compile(rf"{esc}\s*(\d+)\.(\d+)\s*(ป|ม)\.?\s*(\d+)\s*/\s*(\d+)")


def norm_code(raw: str, prefix: str) -> str | None:
    m = build_code_re(prefix).search(norm(raw))
    if not m:
        return None
    a, b, lv, g, n = m.groups()
    return f"{prefix} {a}.{b} {lv}.{g}/{n}"


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


def strand_from_standard(prefix: str, standard_code: str) -> tuple[int, str]:
    major = int(re.search(r"(\d+)", standard_code).group(1)) if re.search(r"(\d+)", standard_code) else 0
    if prefix == "ค":
        names = {1: "จำนวนและการดำเนินการ", 2: "การวัดและเรขาคณิต", 3: "ข้อมูลและสถิติ"}
        return major, names.get(major, f"สาระที่ {major}")
    if prefix == "ส":
        names = {
            1: "ศาสนา",
            2: "หน้าที่พลเมืองและวัฒนธรรม",
            3: "เศรษฐศาสตร์",
            4: "ประวัติศาสตร์",
            5: "ภูมิศาสตร์",
        }
        return major, names.get(major, f"สาระที่ {major}")
    return major, f"สาระที่ {major}"


def find_indicator_table_start(doc: fitz.Document) -> int:
    for i in range(len(doc)):
        text = norm(doc[i].get_text())
        if "ตัวชี้วัดระหว่างทาง" not in text or "ตัวชี้วัดปลายทาง" not in text:
            continue
        if re.search(r"(ป|ม)\.\d+", text) or "มาตรฐาน" in text:
            return i
    for i in range(len(doc)):
        if "ส่วนที่ 4" in norm(doc[i].get_text()) and i >= 15:
            return i
    return 0


def is_part5_section_page(text: str) -> bool:
    t = norm(text).lstrip()
    return t.startswith("ส่วนที่ 5") or t.startswith("ส่วนที่ ๕")


def row_has_code_prefix(row: dict, code_prefix: str) -> bool:
    code_re = build_code_re(code_prefix)
    for field in ("indicatorCode", "midwayIndicator", "exitIndicator"):
        value = row.get(field) or ""
        if code_re.search(norm(value)):
            return True
    return False


def parse_pdf(
    pdf_path: Path,
    *,
    code_prefix: str,
    subject: str,
    learning_area: str,
    id_prefix: str,
    standard_descriptions: dict[str, str],
) -> list[dict]:
    code_re = build_code_re(code_prefix)
    grade_re = re.compile(r"^(ป|ม)\.(\d+)$")
    strand_re = re.compile(r"^สาระที่\s*(\d+)\s+(.+)")

    doc = fitz.open(pdf_path)
    part4_start = find_indicator_table_start(doc)

    rows: list[dict] = []
    row_id = 0
    strand_no = 0
    strand_name = ""
    standard_code = ""
    current_grade = ""

    for page_index in range(part4_start, len(doc)):
        text = norm(doc[page_index].get_text())
        if page_index > part4_start and is_part5_section_page(text):
            break

        spans = page_spans(doc[page_index])
        if not spans:
            continue

        for _, _, t in spans:
            m_strand = strand_re.match(t)
            if m_strand:
                strand_no = int(m_strand.group(1))
                strand_name = norm(m_strand.group(2))
            if t.startswith("มาตรฐาน"):
                sm = re.search(rf"{re.escape(code_prefix)}\s*[\d.]+\s*[\d.]*", t)
                if sm:
                    raw = sm.group(0)
                    m = re.search(rf"{re.escape(code_prefix)}\s*(\d+)\.(\d+)", raw)
                    if m:
                        standard_code = f"{code_prefix} {m.group(1)}.{m.group(2)}"

        for row_spans in group_rows(spans):
            cols = row_columns(row_spans)
            grade_cell = cols.get("grade", "")
            g = grade_re.match(grade_cell)
            if g:
                current_grade = f"{g.group(1)}.{g.group(2)}"

            midway = cols.get("midway", "")
            exit_ = cols.get("exit", "")
            learning = cols.get("learning", "")

            if not current_grade:
                continue
            if midway in {"", "-", "ชั้น", "ตัวชี้วัดระหว่างทาง"}:
                midway = ""
            if exit_ in {"", "-", "ตัวชี้วัดปลายทาง"}:
                exit_ = ""

            if not midway and not exit_:
                continue

            if not strand_no and standard_code:
                strand_no, strand_name = strand_from_standard(code_prefix, standard_code)

            row_id += 1
            code = norm_code(midway, code_prefix) or norm_code(exit_, code_prefix) or ""
            rows.append(
                {
                    "id": f"{id_prefix}-{current_grade}-{row_id}",
                    "subject": subject,
                    "learningArea": learning_area,
                    "gradeLevel": current_grade,
                    "strandNo": strand_no,
                    "strandName": strand_name,
                    "standardCode": standard_code,
                    "standardDescription": standard_descriptions.get(standard_code, ""),
                    "indicatorCode": code,
                    "midwayIndicator": midway or None,
                    "exitIndicator": exit_ or None,
                    "learningAreaNote": learning or None,
                }
            )

    merged: dict[str, dict] = {}
    for row in rows:
        code = row.get("indicatorCode") or ""
        key = f"{row['gradeLevel']}|{code or row['id']}"
        if key in merged:
            cur = merged[key]
            for field in ("midwayIndicator", "exitIndicator", "learningAreaNote"):
                if row.get(field) and not cur.get(field):
                    cur[field] = row[field]
        else:
            merged[key] = row

    cleaned: list[dict] = []
    for row in merged.values():
        if row.get("midwayIndicator") and "ตารางวิเคราะห์" in row["midwayIndicator"]:
            continue
        exit_val = row.get("exitIndicator") or ""
        if exit_val.strip().isdigit():
            continue
        code = row.get("indicatorCode", "")
        if code:
            grade_in_code = re.search(r"(ป|ม)\.(\d+)", code)
            if grade_in_code and row["gradeLevel"] != f"{grade_in_code.group(1)}.{grade_in_code.group(2)}":
                continue
        if not row.get("midwayIndicator") and not row.get("exitIndicator"):
            continue
        if not row_has_code_prefix(row, code_prefix):
            continue
        cleaned.append(row)

    cleaned.sort(key=lambda r: (r["gradeLevel"], r["strandNo"], r["standardCode"], r.get("indicatorCode", "")))
    return cleaned


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf")
    parser.add_argument("out")
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--subject", required=True)
    parser.add_argument("--learning-area", required=True)
    parser.add_argument("--id-prefix", required=True)
    args = parser.parse_args()

    rows = parse_pdf(
        Path(args.pdf),
        code_prefix=args.prefix,
        subject=args.subject,
        learning_area=args.learning_area,
        id_prefix=args.id_prefix,
        standard_descriptions={},
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    from collections import Counter

    print(f"wrote {len(rows)} rows -> {out}")
    print(dict(Counter(r["gradeLevel"] for r in rows)))


if __name__ == "__main__":
    main()
