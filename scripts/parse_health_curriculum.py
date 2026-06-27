"""Parse health & physical education curriculum indicators from school PDF."""
from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import fitz

PDF_DIR = Path(__file__).resolve().parents[2] / "private_data" / "ksp-curriculum"
OUT = Path(__file__).resolve().parents[1] / "src" / "data" / "curriculum" / "health" / "healthData.json"

PREFIX = "พ"
SUBJECT = "สุขศึกษาและพลศึกษา"
ID_PREFIX = "hlth"

THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
CODE_RE = re.compile(rf"{re.escape(PREFIX)}\s*(\d+)\.(\d+)\s*(ป|ม)\.?\s*(\d+)\s*/\s*(\d+)")
ANY_CODE_RE = re.compile(
    rf"{re.escape(PREFIX)}\s*(\d+)\s*(?:\.|\s+)(\d+)\s*(ป|ม)\.?\s*(\d+)\s*/\s*(\d+)"
)
FULL_CODE_RE = re.compile(
    rf"{re.escape(PREFIX)}\s*(\d+)\s*(?:\.|\s+)(\d+)\s*(ป|ม)\.(\d+)(?:\s*-\s*(\d+))?\s*/\s*(\d+)"
)
M46_HEADER_RE = re.compile(
    r"ระดับชั้นมัธยมศึกษ(?:า)?(?:ป)?ีที่\s*(\d+)\s*[-–]\s*(\d+)|ชั้นมัธยมศึกษ(?:า)?(?:ป)?ีที่\s*(\d+)\s*[-–]\s*(\d+)"
)
ROW_BAND_RE = re.compile(r"^(ม\.\d+(?:-\d+)?)\s+")
SUMMARY_ROW_RE = re.compile(r"รวม\s*\d+\s*ตัวชี้วัด")
GROUP_FOOTER_RE = re.compile(r"^\d+\s*ตัวชี้วัด")
INDICATOR_SUMMARY_TAIL_RE = re.compile(r"\s+\d+\s*ตัวชี้วัด(?:\s+|$)")
ORPHAN_FRAGMENT_RE = re.compile(r"^[,;\s]*(?:ป|ม)\.\d+/\d+")
TRAILING_PAGE_NUM_RE = re.compile(r"\s+\d{1,3}$")
SINGLE_M_GRADE_CODE_RE = re.compile(rf"{re.escape(PREFIX)}\s*\d+\.\d+\s*ม\.[456]/\d+")
GRADE_RE = re.compile(r"^(ป|ม)\.(\d+)$")
STRAND_RE = re.compile(r"^สาระที่\s*(\d+)\s+(.+)")

STRAND_NAMES = {
    1: "การเจริญเติบโตและพัฒนาการ",
    2: "ครอบครัวและเพศศึกษา",
    3: "การเคลื่อนไหว กิจกรรมทางกาย และกีฬา",
    4: "การสร้างเสริมสุขภาพ",
    5: "การป้องกันปัจจัยเสี่ยง",
}

STANDARD_TEXT = {
    "พ 1.1": "เข้าใจธรรมชาติของการเจริญเติบโตและพัฒนาการของมนุษย์",
    "พ 2.1": "เข้าใจและเห็นคุณค่าตนเอง ครอบครัว เพศศึกษา และมีทักษะในการดำเนินชีวิต",
    "พ 3.1": "เข้าใจ มีทักษะในการเคลื่อนไหว กิจกรรมทางกาย การเล่นเกม และกีฬา",
    "พ 3.2": "รักการออกกำลังกาย การเล่นเกม และการเล่นกีฬา ปฏิบัติเป็นประจำอย่างสม่ำเสมอ มีวินัย เคารพสิทธิ กฎ กติกา มีน้ำใจนักกีฬา มีจิตวิญญาณในการแข่งขัน และชื่นชมในสุนทรียภาพของการกีฬา",
    "พ 4.1": "เห็นคุณค่าและมีทักษะในการสร้างเสริมสุขภาพ การดำรงสุขภาพ การป้องกันโรค และการสร้างเสริมสมรรถภาพเพื่อสุขภาพ",
    "พ 5.1": "ป้องกันและหลีกเลี่ยงปัจจัยเสี่ยง พฤติกรรมเสี่ยงต่อสุขภาพ อุบัติเหตุ การใช้ยา สารเสพติด และความรุนแรง",
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).translate(THAI_DIGITS)
    return re.sub(r"\s+", " ", s).strip()


def norm_code(raw: str) -> str | None:
    m = CODE_RE.search(norm(raw))
    if not m:
        return None
    a, b, lv, g, n = m.groups()
    return f"{PREFIX} {a}.{b} {lv}.{g}/{n}"


def grade_from_code(code: str) -> str | None:
    m = re.search(r"(ป|ม)\.(\d+)", code)
    if not m:
        return None
    return f"{m.group(1)}.{m.group(2)}"


def standard_from_code(indicator_code: str) -> str:
    m = re.search(rf"{re.escape(PREFIX)}\s*(\d+)\.(\d+)", indicator_code)
    if not m:
        return ""
    return f"{PREFIX} {m.group(1)}.{m.group(2)}"


def strand_from_standard(standard_code: str) -> tuple[int, str]:
    m = re.search(r"(\d+)", standard_code)
    major = int(m.group(1)) if m else 0
    return major, STRAND_NAMES.get(major, f"สาระที่ {major}")


def column_for_x(x: float) -> str | None:
    if x < 140:
        return "grade"
    if x < 250:
        return "midway"
    if x < 400:
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


def find_table_start(doc: fitz.Document) -> int:
    for i in range(len(doc)):
        text = norm(doc[i].get_text())
        if "ตัวชี้วัดระหว่างทาง" in text and "ตัวชี้วัดปลายทาง" in text:
            if re.search(r"(ป|ม)\.\d+", text) or "มาตรฐาน" in text:
                return i
    return 0


def is_part5_page(text: str) -> bool:
    t = norm(text).lstrip()
    return t.startswith("ส่วนที่ 5") or t.startswith("ส่วนที่ ๕")


def resolve_pdf() -> Path:
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        doc = fitz.open(pdf)
        full = "".join(norm(doc[i].get_text()) for i in range(len(doc)))
        doc.close()
        if re.search(r"พ\s*1\.1\s*ป\.1/1", full) or "สุขศึกษาและพลศึกษา" in pdf.name:
            if re.search(r"พ\s*\d+\.\d+\s*ป\.1/", full):
                return pdf
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        if "สุขศึกษา" in pdf.name:
            return pdf
    return sorted(PDF_DIR.glob("*.pdf"))[4]


def strip_code_prefix(text: str, code: str) -> str:
    text = norm(text)
    if not text:
        return ""
    if text.startswith(code):
        return norm(text[len(code) :]).lstrip(" :-")
    return text


def code_from_full_match(m: re.Match) -> str:
    lv = m.group(3)
    g1 = m.group(4)
    g2 = m.group(5)
    grade_part = f"{lv}.{g1}" if not g2 else f"{lv}.{g1}-{g2}"
    return f"{PREFIX} {m.group(1)}.{m.group(2)} {grade_part}/{m.group(6)}"


def code_from_match(m: re.Match) -> str:
    if m.re is FULL_CODE_RE:
        return code_from_full_match(m)
    return f"{PREFIX} {m.group(1)}.{m.group(2)} {m.group(3)}.{m.group(4)}/{m.group(5)}"


def grades_for_code(code: str) -> list[str]:
    m = re.search(r"(ป|ม)\.(\d+)(?:-(\d+))?/", code)
    if not m:
        gl = grade_from_code(code)
        return [gl] if gl else []
    if m.group(3):
        start, end = int(m.group(2)), int(m.group(3))
        return [f"{m.group(1)}.{i}" for i in range(start, end + 1)]
    return [f"{m.group(1)}.{m.group(2)}"]


def correct_code_for_m46_section(
    code: str,
    section_range: tuple[int, int] | None,
    row_band: str | None,
) -> str:
    m = FULL_CODE_RE.search(code)
    if not m or m.group(3) != "ม" or not section_range:
        return code
    section_min, section_max = section_range
    g1 = int(m.group(4))
    g2 = int(m.group(5)) if m.group(5) else None
    std = f"{PREFIX} {m.group(1)}.{m.group(2)}"
    suffix = m.group(6)
    if g2:
        return code_from_full_match(m)
    if g1 < section_min:
        if row_band and "-" in row_band:
            return f"{std} {row_band}/{suffix}"
        return f"{std} ม.{section_min}-{section_max}/{suffix}"
    return code


def is_summary_list_indicator(value: str | None) -> bool:
    if not value:
        return False
    text = norm(value)
    after_code = re.sub(
        rf"^{re.escape(PREFIX)}\s*\d+\.\d+\s*(?:ป|ม)\.\d+(?:-\d+)?/\d+\s*",
        "",
        text,
    )
    if GROUP_FOOTER_RE.match(after_code):
        return True
    if re.search(rf"\d+\s*ตัวชี้วัด\s+{re.escape(PREFIX)}", after_code):
        return True
    if ORPHAN_FRAGMENT_RE.match(after_code):
        return True
    return False


def has_indicator_description(value: str | None) -> bool:
    if not value or is_summary_list_indicator(value):
        return False
    text = norm(value)
    stripped = re.sub(
        rf"^{re.escape(PREFIX)}\s*\d+\.\d+\s*(?:ป|ม)\.\d+(?:-\d+)?/\d+\s*",
        "",
        text,
    )
    stripped = re.sub(
        rf"(?:{re.escape(PREFIX)}\s*\d+\s+\d+\s*(?:ป|ม)\.\d+(?:/\d+)?\s*)+",
        "",
        stripped,
    )
    stripped = re.sub(r"^(?:ป|ม)\.\d+(?:-\d+)?/\d+\s*", "", stripped).strip()
    return len(stripped) >= 3 and bool(re.search(r"[\u0E00-\u0E7F]", stripped))


def codes_in_cell(cell: str) -> list[str]:
    if not cell:
        return []
    cell = norm(cell)
    codes: list[str] = []
    for match in FULL_CODE_RE.finditer(cell):
        code = code_from_full_match(match)
        if code not in codes:
            codes.append(code)
    for pattern in (CODE_RE, ANY_CODE_RE):
        for match in pattern.finditer(cell):
            code = code_from_match(match)
            if code not in codes:
                codes.append(code)
    return codes


def cell_has_code(cell: str, code: str) -> bool:
    return code in codes_in_cell(cell)


def text_for_code(cell: str, code: str) -> str:
    cell = norm(cell)
    if not cell:
        return ""
    for pattern in (FULL_CODE_RE, CODE_RE, ANY_CODE_RE):
        matches = list(pattern.finditer(cell))
        for i, match in enumerate(matches):
            matched = code_from_full_match(match) if pattern is FULL_CODE_RE else code_from_match(match)
            if matched != code:
                continue
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(cell)
            snippet = norm(cell[start:end]).lstrip(" :-")
            if snippet:
                return snippet
    return strip_code_prefix(cell, code)


def format_indicator(code: str, text: str | None) -> str | None:
    if not text or text in {"-", ""}:
        return None
    text = re.sub(rf"^{re.escape(code)}\s*", "", norm(text)).lstrip(" :-")
    text = re.sub(rf"\s*{re.escape(code)}\s*", " ", text).strip()
    text = re.sub(r"^(ป|ม)\.\d+\s+", "", text).strip()
    if not text:
        return None
    return f"{code} {text}".strip()


LEARNING_NOTE_RE = re.compile(r"^[•⚫]\s*")
NOISE_CONTINUATION_RE = re.compile(
    r"^(สาระ|มาตรฐาน|ชั้น|ตารางวิเคราะห์|กลุ่มสาระ|ส่วนที่|ระดับชั้น)"
)


def is_learning_note(text: str) -> bool:
    return bool(LEARNING_NOTE_RE.match(norm(text)))


def is_noise_continuation(text: str) -> bool:
    text = norm(text)
    if not text:
        return True
    if NOISE_CONTINUATION_RE.match(text):
        return True
    if SUMMARY_ROW_RE.search(text):
        return True
    if GROUP_FOOTER_RE.match(text):
        return True
    if re.fullmatch(r"\d+", text):
        return True
    if "มาตรฐาน" in text and not CODE_RE.search(text) and not FULL_CODE_RE.search(text):
        return True
    return False


def continuation_has_foreign_band(text: str, code: str) -> bool:
    grade_level = grade_from_code(code)
    if not grade_level or not grade_level.startswith("ม."):
        return False
    if int(grade_level.split(".")[1]) > 3:
        return False
    for foreign in codes_in_cell(text):
        if re.search(r"ม\.\d+-\d+", foreign):
            return True
        foreign_grade = grade_from_code(foreign)
        if foreign_grade and foreign_grade.startswith("ม."):
            if int(foreign_grade.split(".")[1]) >= 4:
                return True
    return False


def is_grade_header_row(cols: dict[str, str]) -> bool:
    grade_cell = cols.get("grade", "")
    return bool(GRADE_RE.match(grade_cell)) and not codes_in_cell(grade_cell)


def append_part(parts: dict[str, list[str]], code: str, text: str) -> None:
    text = norm(text)
    if not text or text == "-":
        return
    if GROUP_FOOTER_RE.match(text) or ORPHAN_FRAGMENT_RE.match(text):
        return
    parts.setdefault(code, []).append(text)


def strip_indicator_summary_tail(text: str) -> str:
    text = norm(text)
    match = INDICATOR_SUMMARY_TAIL_RE.search(text)
    if match:
        text = norm(text[: match.start()])
    return text


def build_indicator_from_parts(code: str, parts: list[str]) -> str | None:
    if not parts:
        return None
    combined = strip_indicator_summary_tail(norm(" ".join(parts)))
    return format_indicator(code, combined)


def is_m46_table_page(text: str) -> bool:
    return bool(M46_HEADER_RE.search(norm(text)))


def collect_table_rows(doc: fitz.Document, part4_start: int) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for page_index in range(part4_start, len(doc)):
        text = doc[page_index].get_text()
        if page_index > part4_start and is_part5_page(text):
            break
        if is_m46_table_page(text):
            break
        spans = page_spans(doc[page_index])
        if not spans:
            continue
        for row_spans in group_rows(spans):
            rows.append(row_columns(row_spans))
    return rows


def collect_m46_rows(doc: fitz.Document) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    start_page: int | None = None
    for page_index in range(len(doc)):
        text = doc[page_index].get_text()
        if is_m46_table_page(text) and start_page is None:
            start_page = page_index
        if start_page is None:
            continue
        if page_index > start_page and is_part5_page(text):
            break
        spans = page_spans(doc[page_index])
        if not spans:
            continue
        for row_spans in group_rows(spans):
            rows.append(row_columns(row_spans))
    return rows


def parse_table_rows(all_rows: list[dict[str, str]]) -> dict[str, dict]:
    merged: dict[str, dict] = {}
    midway_parts: dict[str, list[str]] = defaultdict(list)
    exit_parts: dict[str, list[str]] = defaultdict(list)
    learning_notes: dict[str, list[str]] = defaultdict(list)

    current_grade = ""
    open_grade_midway: str | None = None
    open_midway_midway: str | None = None
    open_exit: str | None = None
    row_id = 0

    def ensure_record(code: str) -> dict:
        nonlocal row_id
        grade_level = grade_from_code(code) or current_grade
        std = standard_from_code(code)
        s_no, s_name = strand_from_standard(std)
        key = f"{grade_level}|{code}"
        if key not in merged:
            row_id += 1
            merged[key] = {
                "id": f"{ID_PREFIX}-{grade_level}-{row_id}",
                "subject": SUBJECT,
                "learningArea": SUBJECT,
                "gradeLevel": grade_level,
                "strandNo": s_no,
                "strandName": s_name,
                "standardCode": std,
                "standardDescription": STANDARD_TEXT.get(std, ""),
                "indicatorCode": code,
                "midwayIndicator": None,
                "exitIndicator": None,
                "learningAreaNote": None,
            }
        return merged[key]

    def sync_indicators(code: str) -> None:
        record = ensure_record(code)
        midway = build_indicator_from_parts(code, midway_parts.get(code, []))
        exit_ = build_indicator_from_parts(code, exit_parts.get(code, []))
        if midway:
            record["midwayIndicator"] = midway
        if exit_:
            record["exitIndicator"] = exit_
        notes = [n for n in learning_notes.get(code, []) if n]
        if notes:
            record["learningAreaNote"] = norm(" ".join(notes))

    for cols in all_rows:
        joined = norm(" ".join(cols.values()))
        if SUMMARY_ROW_RE.search(joined):
            open_grade_midway = None
            open_midway_midway = None
            open_exit = None
            continue

        if any(GROUP_FOOTER_RE.match(cols.get(col, "")) for col in ("grade", "midway", "exit")):
            open_grade_midway = None
            open_midway_midway = None
            open_exit = None
            continue

        if is_grade_header_row(cols):
            header = GRADE_RE.match(cols["grade"])
            if header:
                current_grade = f"{header.group(1)}.{header.group(2)}"
            open_grade_midway = None
            open_midway_midway = None
            open_exit = None
            continue

        grade_cell = cols.get("grade", "")
        midway_cell = cols.get("midway", "")
        exit_cell = cols.get("exit", "")
        learning_cell = cols.get("learning", "")

        grade_codes = codes_in_cell(grade_cell)
        midway_codes = codes_in_cell(midway_cell)
        exit_codes = codes_in_cell(exit_cell)

        for code in grade_codes:
            open_grade_midway = code
            append_part(midway_parts, code, text_for_code(grade_cell, code))
            sync_indicators(code)

        for code in midway_codes:
            open_midway_midway = code
            append_part(midway_parts, code, text_for_code(midway_cell, code))
            sync_indicators(code)

        for code in exit_codes:
            open_exit = code
            snippet = text_for_code(exit_cell, code)
            if snippet:
                append_part(exit_parts, code, snippet)
            sync_indicators(code)

        if open_grade_midway and not grade_codes:
            text = grade_cell
            if text and not GRADE_RE.match(text):
                if is_noise_continuation(text):
                    open_grade_midway = None
                else:
                    append_part(midway_parts, open_grade_midway, text)
                    sync_indicators(open_grade_midway)

        if open_midway_midway and not midway_codes:
            text = midway_cell
            if text:
                if is_noise_continuation(text):
                    open_midway_midway = None
                else:
                    append_part(midway_parts, open_midway_midway, text)
                    sync_indicators(open_midway_midway)

        if open_exit and not exit_codes:
            text = exit_cell
            if text and not is_learning_note(text):
                if continuation_has_foreign_band(text, open_exit):
                    open_exit = None
                else:
                    append_part(exit_parts, open_exit, text)
                    sync_indicators(open_exit)

        for note_cell in (exit_cell, learning_cell):
            if note_cell and is_learning_note(note_cell):
                target_code = open_grade_midway or open_midway_midway or open_exit
                if target_code:
                    note = norm(LEARNING_NOTE_RE.sub("", note_cell))
                    if note:
                        learning_notes[target_code].append(note)

    return merged


def parse_m46_table_rows(all_rows: list[dict[str, str]]) -> dict[str, dict]:
    merged: dict[str, dict] = {}
    midway_parts: dict[str, list[str]] = defaultdict(list)
    exit_parts: dict[str, list[str]] = defaultdict(list)
    learning_notes: dict[str, list[str]] = defaultdict(list)

    section_range: tuple[int, int] | None = (4, 6)
    row_band: str | None = None
    open_grade_midway: str | None = None
    open_midway_midway: str | None = None
    open_exit: str | None = None
    row_id = 0

    def register_code(raw_code: str) -> str:
        return correct_code_for_m46_section(raw_code, section_range, row_band)

    def ensure_records(raw_code: str) -> list[tuple[str, str]]:
        corrected = register_code(raw_code)
        records: list[tuple[str, str]] = []
        for grade_level in grades_for_code(corrected):
            if not grade_level.startswith("ม."):
                continue
            if int(grade_level.split(".")[1]) < 4:
                continue
            std = standard_from_code(corrected)
            s_no, s_name = strand_from_standard(std)
            key = f"{grade_level}|{corrected}"
            if key not in merged:
                nonlocal row_id
                row_id += 1
                merged[key] = {
                    "id": f"{ID_PREFIX}-{grade_level}-m46-{row_id}",
                    "subject": SUBJECT,
                    "learningArea": SUBJECT,
                    "gradeLevel": grade_level,
                    "strandNo": s_no,
                    "strandName": s_name,
                    "standardCode": std,
                    "standardDescription": STANDARD_TEXT.get(std, ""),
                    "indicatorCode": corrected,
                    "midwayIndicator": None,
                    "exitIndicator": None,
                    "learningAreaNote": None,
                }
            records.append((corrected, grade_level))
        return records

    def sync_code(raw_code: str) -> None:
        corrected = register_code(raw_code)
        midway = build_indicator_from_parts(corrected, midway_parts.get(corrected, []))
        exit_ = build_indicator_from_parts(corrected, exit_parts.get(corrected, []))
        for grade_level in grades_for_code(corrected):
            if not grade_level.startswith("ม.") or int(grade_level.split(".")[1]) < 4:
                continue
            key = f"{grade_level}|{corrected}"
            if key not in merged:
                ensure_records(raw_code)
            record = merged[key]
            if midway:
                record["midwayIndicator"] = midway
            if exit_:
                record["exitIndicator"] = exit_
            notes = [n for n in learning_notes.get(corrected, []) if n]
            if notes:
                record["learningAreaNote"] = norm(" ".join(notes))

    for cols in all_rows:
        joined = norm(" ".join(cols.values()))
        header = M46_HEADER_RE.search(joined) or M46_HEADER_RE.search(cols.get("grade", ""))
        if header:
            g1 = header.group(1) or header.group(3)
            g2 = header.group(2) or header.group(4)
            if g1 and g2:
                section_range = (int(g1), int(g2))
            open_grade_midway = None
            open_midway_midway = None
            open_exit = None
            row_band = None
            continue

        if SUMMARY_ROW_RE.search(joined):
            open_grade_midway = None
            open_midway_midway = None
            open_exit = None
            continue

        if cols.get("midway") == "ตัวชี้วัดระหว่างทาง" or cols.get("grade") == "ชั้น":
            open_grade_midway = None
            open_midway_midway = None
            open_exit = None
            continue

        grade_cell = cols.get("grade", "")
        midway_cell = cols.get("midway", "")
        exit_cell = cols.get("exit", "")
        learning_cell = cols.get("learning", "")

        band_match = ROW_BAND_RE.match(grade_cell)
        if band_match:
            row_band = band_match.group(1)

        grade_codes = codes_in_cell(grade_cell)
        midway_codes = codes_in_cell(midway_cell)
        exit_codes = codes_in_cell(exit_cell)

        for raw_code in grade_codes:
            corrected = register_code(raw_code)
            open_grade_midway = corrected
            ensure_records(raw_code)
            append_part(midway_parts, corrected, text_for_code(grade_cell, raw_code))
            sync_code(raw_code)

        for raw_code in midway_codes:
            corrected = register_code(raw_code)
            open_midway_midway = corrected
            ensure_records(raw_code)
            append_part(midway_parts, corrected, text_for_code(midway_cell, raw_code))
            sync_code(raw_code)

        for raw_code in exit_codes:
            corrected = register_code(raw_code)
            open_exit = corrected
            ensure_records(raw_code)
            snippet = text_for_code(exit_cell, raw_code)
            if snippet:
                append_part(exit_parts, corrected, snippet)
            sync_code(raw_code)

        if open_grade_midway and not grade_codes:
            text = grade_cell
            if text and not GRADE_RE.match(text) and not is_noise_continuation(text):
                append_part(midway_parts, open_grade_midway, text)
                sync_code(open_grade_midway)

        if open_midway_midway and not midway_codes:
            text = midway_cell
            if text and not is_noise_continuation(text):
                append_part(midway_parts, open_midway_midway, text)
                sync_code(open_midway_midway)

        if open_exit and not exit_codes:
            text = exit_cell
            if text and not is_learning_note(text) and not text.startswith("-"):
                append_part(exit_parts, open_exit, text)
                sync_code(open_exit)

        for note_cell in (exit_cell, learning_cell):
            if note_cell and is_learning_note(note_cell):
                target = open_grade_midway or open_midway_midway or open_exit
                if target:
                    note = norm(LEARNING_NOTE_RE.sub("", note_cell))
                    if note:
                        learning_notes[target].append(note)

    return merged


def merge_record(existing: dict | None, incoming: dict) -> dict:
    if existing is None:
        return incoming
    for field in ("midwayIndicator", "exitIndicator", "learningAreaNote"):
        cur = existing.get(field)
        new = incoming.get(field)
        if not new:
            continue
        if not cur or (has_indicator_description(new) and not has_indicator_description(cur)):
            existing[field] = new
        elif has_indicator_description(new) and has_indicator_description(cur) and len(new) > len(cur):
            existing[field] = new
    return existing


def is_spurious_m46_single_grade_record(row: dict) -> bool:
    code = row.get("indicatorCode", "")
    if not SINGLE_M_GRADE_CODE_RE.search(code):
        return False
    grade = row.get("gradeLevel", "")
    if not grade.startswith("ม."):
        return False
    if int(grade.split(".")[1]) < 4:
        return False
    midway = row.get("midwayIndicator")
    exit_ = row.get("exitIndicator")
    if has_indicator_description(midway) or has_indicator_description(exit_):
        return False
    return True


STD_TOKEN = re.compile(rf"{re.escape(PREFIX)}\s*(\d+)\s*(?:\.|\s+)(\d+)")
ORPHAN_CODE_TOKEN = re.compile(r"(ป|ม)\.(\d+)/(\d+)")


def grade_hint_from_text(text: str) -> str | None:
    m = re.search(r"ชั้น(?:มัธยมศึกษา)?(?:ศึกษา)?ปีที่\s*(\d+)", text)
    if m:
        return f"ม.{m.group(1)}"
    m = re.search(r"ชั้นประถมศึกษาปีที่\s*(\d+)", text)
    if m:
        return f"ป.{m.group(1)}"
    return None


def extract_codes_from_course_section(section: str) -> list[str]:
    section = norm(section)
    codes: list[str] = []
    last_std = ""
    i = 0
    while i < len(section):
        std_m = STD_TOKEN.match(section, i)
        if std_m:
            last_std = f"{PREFIX} {std_m.group(1)}.{std_m.group(2)}"
            i = std_m.end()
            continue

        full_m = ANY_CODE_RE.match(section, i)
        if full_m:
            code = code_from_match(full_m)
            codes.append(code)
            last_std = standard_from_code(code)
            i = full_m.end()
            while i < len(section) and section[i] in ", ":
                i += 1
            continue

        orphan_m = ORPHAN_CODE_TOKEN.match(section, i)
        if orphan_m and last_std:
            code = f"{last_std} {orphan_m.group(1)}.{orphan_m.group(2)}/{orphan_m.group(3)}"
            codes.append(code)
            i = orphan_m.end()
            while i < len(section) and section[i] in ", ":
                i += 1
            continue

        i += 1
    return codes


def split_course_indicator_parts(text: str) -> tuple[str, str]:
    midway_part = ""
    exit_part = ""
    midway_markers = ("รหัสตัวชี้วัดระหว่างทาง", "ตัวชี้วัดระหว่างทาง")
    exit_markers = ("รหัสตัวชี้วัดปลายทาง", "ตัวชี้วัดปลายทาง")

    midway_index = -1
    midway_marker = ""
    for marker in midway_markers:
        idx = text.find(marker)
        if idx != -1 and (midway_index == -1 or idx < midway_index):
            midway_index = idx
            midway_marker = marker

    if midway_index == -1:
        return midway_part, exit_part

    after_mid = text[midway_index + len(midway_marker) :]
    exit_index = -1
    exit_marker = ""
    for marker in exit_markers:
        idx = after_mid.find(marker)
        if idx != -1 and (exit_index == -1 or idx < exit_index):
            exit_index = idx
            exit_marker = marker

    if exit_index != -1:
        midway_part = after_mid[:exit_index]
        exit_part = after_mid[exit_index + len(exit_marker) :]
    else:
        midway_part = after_mid

    if "รวมทั้งหมด" in exit_part:
        exit_part = exit_part.split("รวมทั้งหมด", 1)[0]
    if "รวมทั้งหมด" in midway_part:
        midway_part = midway_part.split("รวมทั้งหมด", 1)[0]

    return norm(midway_part), norm(exit_part)


def parse_subject_description_pages(doc: fitz.Document) -> list[dict]:
    rows: list[dict] = []
    row_id = 0
    for page_index in range(len(doc)):
        text = norm(doc[page_index].get_text())
        if "คำอธิบายรายวิชา" not in text and "คําอธิบายรายวิชา" not in text:
            continue
        if "สุขศึกษา" not in text and "พลศึกษา" not in text:
            continue

        grade_hint = grade_hint_from_text(text)
        midway_part, exit_part = split_course_indicator_parts(text)
        if not midway_part and not exit_part:
            continue

        midway_codes = extract_codes_from_course_section(midway_part)
        exit_codes = extract_codes_from_course_section(exit_part)
        all_codes = sorted(set(midway_codes + exit_codes))

        for code in all_codes:
            grade_level = grade_from_code(code) or grade_hint
            if not grade_level:
                continue
            if grade_level.startswith("ม.") and int(grade_level.split(".")[1]) >= 4:
                continue

            std = standard_from_code(code)
            s_no, s_name = strand_from_standard(std)
            midway = (
                format_indicator(code, text_for_code(midway_part, code))
                if code in midway_codes
                else None
            )
            exit_ = (
                format_indicator(code, text_for_code(exit_part, code))
                if code in exit_codes
                else None
            )
            if not has_indicator_description(midway) and not has_indicator_description(exit_):
                continue

            row_id += 1
            rows.append(
                {
                    "id": f"{ID_PREFIX}-{grade_level}-subj-{row_id}",
                    "subject": SUBJECT,
                    "learningArea": SUBJECT,
                    "gradeLevel": grade_level,
                    "strandNo": s_no,
                    "strandName": s_name,
                    "standardCode": std,
                    "standardDescription": STANDARD_TEXT.get(std, ""),
                    "indicatorCode": code,
                    "midwayIndicator": midway,
                    "exitIndicator": exit_,
                    "learningAreaNote": None,
                }
            )
    return rows


def polish_indicator_field(value: str | None) -> str | None:
    if not value:
        return None
    polished = TRAILING_PAGE_NUM_RE.sub("", strip_indicator_summary_tail(value))
    if not has_indicator_description(polished):
        return None
    return polished


def parse() -> list[dict]:
    doc = fitz.open(resolve_pdf())
    part4_start = find_table_start(doc)

    merged: dict[str, dict] = {}
    for key, row in parse_table_rows(collect_table_rows(doc, part4_start)).items():
        merged[key] = row

    for key, row in parse_m46_table_rows(collect_m46_rows(doc)).items():
        merged[key] = merge_record(merged.get(key), row)

    for row in parse_subject_description_pages(doc):
        if is_spurious_m46_single_grade_record(row):
            continue
        key = f"{row['gradeLevel']}|{row['indicatorCode']}"
        merged[key] = merge_record(merged.get(key), row)

    doc.close()

    for row in merged.values():
        row["midwayIndicator"] = polish_indicator_field(row.get("midwayIndicator"))
        row["exitIndicator"] = polish_indicator_field(row.get("exitIndicator"))

    cleaned = [
        row
        for row in merged.values()
        if (has_indicator_description(row.get("midwayIndicator")) or has_indicator_description(row.get("exitIndicator")))
        and not (row.get("midwayIndicator") or "").startswith("ตารางวิเคราะห์")
        and not is_spurious_m46_single_grade_record(row)
    ]
    cleaned.sort(key=lambda r: (r["gradeLevel"], r["strandNo"], r["standardCode"], r["indicatorCode"]))
    return cleaned


def main() -> None:
    rows = parse()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    from collections import Counter

    print(f"wrote {len(rows)} rows -> {OUT}")
    print(dict(Counter(r["gradeLevel"] for r in rows)))


if __name__ == "__main__":
    main()
