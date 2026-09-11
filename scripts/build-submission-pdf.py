"""Build the reviewer-facing submission PDF from the editable Markdown reports.

Markdown remains the source of truth. This exporter creates two readable diagrams,
adds a contents page, renders the main case study, and includes the important
current sprint reports as labelled appendices. It deliberately excludes archived
documents, credentials and raw test fixtures.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image as ReportImage,
    LongTable,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "deliverables" / "case-study-and-prd.md"
OUTPUT = ROOT / "deliverables" / "InterviewMate-Submission-Package.pdf"
PUBLIC_OUTPUT = ROOT / "public" / "InterviewMate-Submission-Package.pdf"
ASSET_DIR = ROOT / "deliverables" / "assets"
PREVIEW_DIR = ROOT / "tmp" / "pdf-review"

GREEN = colors.HexColor("#184C38")
INK = colors.HexColor("#21342D")
MUTED = colors.HexColor("#56655E")
PALE = colors.HexColor("#F5F7F3")
PALE_GREEN = colors.HexColor("#E8F0EA")
GRID = colors.HexColor("#C9D6CC")

APPENDICES = [
    ("Appendix A - Product sprint brief and current status", ROOT / "Product_Sprint.md"),
    ("Appendix B - Phase 1 discovery and UX", ROOT / "docs/hr-product-sprint/phases/01-discovery-and-ux.md"),
    ("Appendix C - Phase 2 solution design and AI logic", ROOT / "docs/hr-product-sprint/phases/02-solution-design-and-ai-logic.md"),
    ("Appendix D - Phase 3 prototype build", ROOT / "docs/hr-product-sprint/phases/03-prototype-build.md"),
    ("Appendix E - Phase 4 evaluation and iteration", ROOT / "docs/hr-product-sprint/phases/04-evaluation-and-iteration.md"),
    ("Appendix F - Phase 5 case study and handoff", ROOT / "docs/hr-product-sprint/phases/05-case-study-and-handoff.md"),
    ("Appendix G - MVP readiness audit", ROOT / "deliverables/mvp-readiness-audit.md"),
    ("Appendix H - Production release validation", ROOT / "docs/hr-product-sprint/evaluation/results/2026-09-11-production-release.md"),
    ("Appendix I - CV pipeline validation", ROOT / "docs/hr-product-sprint/evaluation/cv-pipeline-validation.md"),
    ("Appendix J - Data governance", ROOT / "docs/hr-product-sprint/evaluation/data-governance.md"),
    ("Appendix K - Future feedback and privacy-aware learning", ROOT / "docs/hr-product-sprint/implementation/future-feedback-and-learning.md"),
    ("Appendix L - Current runbook", ROOT / "docs/hr-product-sprint/implementation/current-runbook.md"),
    ("Appendix M - Five-minute demo script", ROOT / "deliverables/demo-script.md"),
]


def load_font(size: int, bold: bool = False):
    path = Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(path), size=size)


def wrapped_lines(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=font)[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def draw_box(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], number: str, title: str, body: str):
    left, top, right, bottom = xy
    draw.rounded_rectangle(xy, radius=22, fill="#E8F0EA", outline="#184C38", width=3)
    draw.ellipse((left + 20, top + 20, left + 62, top + 62), fill="#184C38")
    draw.text((left + 32, top + 27), number, font=load_font(20, True), fill="#FFFFFF", anchor="mm")
    title_font = load_font(28, True)
    body_font = load_font(21)
    draw.text((left + 82, top + 26), title, font=title_font, fill="#21342D")
    lines = wrapped_lines(draw, body, body_font, right - left - 45)
    draw.multiline_text((left + 24, top + 74), "\n".join(lines[:3]), font=body_font, fill="#56655E", spacing=5)


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int]):
    draw.line((*start, *end), fill="#5D8E72", width=5)
    direction = 1 if end[0] >= start[0] else -1
    size = 14
    draw.polygon(
        [(end[0], end[1]), (end[0] - direction * size, end[1] - size), (end[0] - direction * size, end[1] + size)],
        fill="#5D8E72",
    )


def build_diagram(path: Path, title: str, nodes: list[tuple[str, str]], edges: list[tuple[int, int]]):
    width, height = 2000, 1220
    image = Image.new("RGB", (width, height), "#F5F7F3")
    draw = ImageDraw.Draw(image)
    draw.text((80, 50), title, font=load_font(40, True), fill="#21342D")
    draw.text((80, 105), "InterviewMate MVP handoff", font=load_font(22), fill="#56655E")
    positions = [
        (80, 180), (765, 180), (1450, 180),
        (1450, 500), (765, 500), (80, 500),
        (80, 820), (765, 820), (1450, 820),
    ]
    box_w, box_h = 470, 180
    for index, (node_title, node_body) in enumerate(nodes):
        x, y = positions[index]
        draw_box(draw, (x, y, x + box_w, y + box_h), str(index + 1), node_title, node_body)
    for source, target in edges:
        sx, sy = positions[source]
        tx, ty = positions[target]
        if ty > sy:
            arrow(draw, (sx + box_w // 2, sy + box_h), (tx + box_w // 2, ty))
        else:
            arrow(draw, (sx + box_w, sy + box_h // 2), (tx, ty + box_h // 2))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def build_diagrams() -> tuple[Path, Path]:
    workflow = ASSET_DIR / "interviewmate-workflow.png"
    ai_logic = ASSET_DIR / "interviewmate-ai-logic.png"
    build_diagram(
        workflow,
        "From CV intake to reviewable evidence",
        [
            ("Role brief", "Enter one job description for the batch"),
            ("Batch CVs", "Upload up to 50 PDF resumes"),
            ("ATS ranking", "Parse identity and rank fit"),
            ("Select", "Recruiter checks candidates to invite"),
            ("Interview link", "Set shared language and timing"),
            ("Candidate session", "Admit, recover and complete"),
            ("Draft + Send", "Voice becomes editable text"),
            ("Evidence", "Validate quotes and competency levels"),
            ("Recruiter history", "Review ATS, assessment and feedback"),
        ],
        [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8)],
    )
    build_diagram(
        ai_logic,
        "AI boundaries and deterministic checks",
        [
            ("CV + job brief", "Bounded context only"),
            ("Voice input", "Candidate microphone"),
            ("Transcribe", "Language-aware draft"),
            ("Editable draft", "Candidate corrects text"),
            ("Explicit Send", "Only committed answers proceed"),
            ("Eligible answer", "Skip filler and technical failures"),
            ("Evidence model", "Structured levels with exact quotes"),
            ("Validate", "Schema and quote checks"),
            ("Score + human", "Percentage plus recruiter review"),
        ],
        [(0, 6), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8)],
    )
    return workflow, ai_logic


def plain(text: str) -> str:
    value = text.strip()
    value = value.replace("→", "->").replace("–", "-").replace("—", "-")
    value = value.replace("’", "'").replace("“", '"').replace("”", '"')
    value = escape(value)
    value = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", value)
    value = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', value)
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", value)
    return value


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("SubmissionTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=25, leading=30, textColor=INK, spaceAfter=12, alignment=TA_LEFT),
        "appendix_title": ParagraphStyle("AppendixTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=INK, spaceAfter=10, alignment=TA_LEFT),
        "subtitle": ParagraphStyle("SubmissionSubtitle", parent=base["Normal"], fontName="Helvetica", fontSize=11, leading=16, textColor=GREEN, spaceAfter=10),
        "status": ParagraphStyle("SubmissionStatus", parent=base["Normal"], fontName="Helvetica", fontSize=9, leading=14, textColor=MUTED, spaceAfter=16),
        "h1": ParagraphStyle("SectionHeading", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=INK, spaceBefore=18, spaceAfter=8, keepWithNext=True),
        "h2": ParagraphStyle("Subheading", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=GREEN, spaceBefore=12, spaceAfter=5, keepWithNext=True),
        "body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.5, textColor=MUTED, spaceAfter=8, splitLongWords=True),
        "bullet": ParagraphStyle("Bullet", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.5, leftIndent=13, firstLineIndent=-8, textColor=MUTED, spaceAfter=4),
        "toc": ParagraphStyle("Contents", parent=base["BodyText"], fontName="Helvetica", fontSize=10, leading=17, textColor=INK, leftIndent=7, spaceAfter=3),
        "table_head": ParagraphStyle("TableHead", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=7.3, leading=9.5, textColor=colors.white),
        "table_cell": ParagraphStyle("TableCell", parent=base["BodyText"], fontName="Helvetica", fontSize=7.0, leading=9.2, textColor=INK, splitLongWords=True),
        "code": ParagraphStyle("Code", parent=base["Code"], fontName="Courier", fontSize=6.5, leading=8.1, textColor=INK),
    }


def table_from_rows(rows: list[list[str]], styles: dict[str, ParagraphStyle]):
    if not rows:
        return None
    count = max(len(row) for row in rows)
    normalized = [row + [""] * (count - len(row)) for row in rows]
    cells = [[Paragraph(plain(cell), styles["table_head"] if i == 0 else styles["table_cell"]) for cell in row] for i, row in enumerate(normalized)]
    available = A4[0] - (38 * mm)
    weights = [max(1, max(len(row[column]) for row in normalized)) for column in range(count)]
    total = sum(weights)
    widths = [max(42, available * weight / total) for weight in weights]
    if sum(widths) > available:
        scale = available / sum(widths)
        widths = [width * scale for width in widths]
    table = LongTable(cells, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), GREEN), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.45, GRID), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    for row_index in range(1, len(cells)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), PALE_GREEN))
    table.setStyle(TableStyle(commands))
    return table


def parse_markdown(text: str, styles: dict[str, ParagraphStyle], diagram_paths: list[Path] | None = None, skip_front_matter: bool = False, skip_leading_title: bool = False):
    lines = text.replace("\r\n", "\n").split("\n")
    if skip_front_matter:
        first_section = next((i for i, line in enumerate(lines) if re.match(r"^##\s+", line.strip())), len(lines))
        lines = lines[first_section:]
    story = []
    index = 0
    diagram_index = 0
    first_nonblank = True
    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped:
            index += 1
            continue

        if stripped.startswith("```"):
            language = stripped[3:].strip()
            code_lines = []
            index += 1
            while index < len(lines) and lines[index].strip() != "```":
                code_lines.append(lines[index].replace("->", "to").replace("-->", "to"))
                index += 1
            if index < len(lines):
                index += 1
            if language == "mermaid" and diagram_paths and diagram_index < len(diagram_paths):
                diagram = diagram_paths[diagram_index]
                diagram_index += 1
                story.append(Paragraph("Visual flow", styles["h2"]))
                with Image.open(diagram) as image:
                    ratio = image.height / image.width
                width = A4[0] - (38 * mm)
                height = min(width * ratio, 105 * mm)
                story.append(ReportImage(str(diagram), width=width, height=height, hAlign="LEFT"))
                story.append(Spacer(1, 9))
            elif code_lines:
                label = f"{language or 'Code'} example"
                story.append(Paragraph(label, styles["h2"]))
                story.append(Preformatted("\n".join(code_lines), styles["code"], maxLineLength=120))
                story.append(Spacer(1, 5))
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            level, title = len(heading.group(1)), heading.group(2)
            if level == 1 and skip_leading_title and first_nonblank:
                first_nonblank = False
                index += 1
                continue
            if level == 1:
                story.append(Paragraph(plain(title), styles["title"]))
            elif level == 2:
                story.append(Paragraph(plain(title), styles["h1"]))
            else:
                story.append(Paragraph(plain(title), styles["h2"]))
            first_nonblank = False
            index += 1
            continue

        if stripped.startswith("|") and index + 1 < len(lines):
            separator_cells = [cell.strip() for cell in lines[index + 1].strip().strip("|").split("|")]
            if separator_cells and all(re.fullmatch(r":?-{3,}:?", cell) for cell in separator_cells):
                rows = []
                while index < len(lines) and lines[index].strip().startswith("|"):
                    row = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                    if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in row):
                        rows.append(row)
                    index += 1
                table = table_from_rows(rows, styles)
                if table:
                    story.extend([Spacer(1, 3), table, Spacer(1, 9)])
                continue

        if re.match(r"^(?:[-*]|\d+\.)\s+", stripped):
            while index < len(lines):
                item = re.match(r"^(?:[-*]|\d+\.)\s+(.+)$", lines[index].strip())
                if not item:
                    break
                marker = "•" if not re.match(r"^\d+\.", lines[index].strip()) else lines[index].strip().split(" ", 1)[0]
                story.append(Paragraph(plain(f"{marker} {item.group(1)}"), styles["bullet"]))
                index += 1
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            candidate = lines[index].strip()
            if not candidate or candidate.startswith("#") or candidate.startswith("|") or candidate.startswith("```") or re.match(r"^(?:[-*]|\d+\.)\s+", candidate):
                break
            paragraph_lines.append(candidate)
            index += 1
        story.append(Paragraph(plain(" ".join(paragraph_lines)), styles["body"]))
        first_nonblank = False
    return story


def draw_chrome(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(PALE)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.rect(19 * mm, height - 17 * mm, 12 * mm, 1.2 * mm, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(35 * mm, height - 17 * mm, "INTERVIEWMATE / PRODUCT SPRINT")
    canvas.setStrokeColor(GRID)
    canvas.line(19 * mm, 17 * mm, width - 19 * mm, 17 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(19 * mm, 11 * mm, "Case study, reports and engineering handoff / 11 September 2026")
    canvas.drawRightString(width - 19 * mm, 11 * mm, f"{doc.page}")
    canvas.restoreState()


def summary_table(styles):
    rows = [
        [Paragraph("Package", styles["table_head"]), Paragraph("Current contents", styles["table_head"])],
        [Paragraph("Prototype", styles["table_cell"]), Paragraph("Production web app with recruiter pipeline, candidate interview and evidence review", styles["table_cell"])],
        [Paragraph("Case study", styles["table_cell"]), Paragraph("Problem, UX, AI boundaries, scoring, evaluation limits and engineering handoff", styles["table_cell"])],
        [Paragraph("Appendices", styles["table_cell"]), Paragraph("Phase 1-5 reports, MVP audit, release evidence, governance, roadmap, runbook and demo script", styles["table_cell"])],
    ]
    table = Table(rows, colWidths=[45 * mm, 120 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN), ("GRID", (0, 0), (-1, -1), 0.45, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("BACKGROUND", (0, 2), (-1, 2), PALE_GREEN),
    ]))
    return table


def main() -> None:
    workflow, ai_logic = build_diagrams()
    styles = make_styles()
    story = [
        Spacer(1, 18 * mm),
        Paragraph("PRODUCT SPRINT / REVIEWER PACKAGE", styles["h2"]),
        Paragraph("InterviewMate - from CV intake to reviewable interview evidence", styles["title"]),
        Paragraph("Case study, MVP requirements, phase reports and engineering handoff / 11 September 2026", styles["subtitle"]),
        Paragraph("This PDF is a readable submission export. The editable Markdown files remain the source of truth, and the production URL remains the runnable prototype.", styles["status"]),
        Spacer(1, 8 * mm),
        summary_table(styles),
        Spacer(1, 12 * mm),
        Paragraph("Submission status", styles["h2"]),
        Paragraph("The MVP is deployed and documented. The five-minute recording and final portal upload are still the remaining human submission steps. Manual-versus-assisted timing is disclosed as unmeasured rather than presented as a fabricated result.", styles["body"]),
        PageBreak(),
        Paragraph("Contents", styles["title"]),
        Paragraph("The first section is the concise case study and handoff. The appendices preserve the important current Markdown reports so a reviewer can trace the decisions and evidence without opening the repository.", styles["body"]),
        Paragraph("Main submission", styles["h2"]),
        Paragraph("1. Case study, MVP requirements, UX, AI logic, evaluation and engineering handoff", styles["toc"]),
        Paragraph("Appendices", styles["h2"]),
    ]
    for label, _ in APPENDICES:
        story.append(Paragraph(label, styles["toc"]))
    story.append(PageBreak())
    story.extend(parse_markdown(SOURCE.read_text(encoding="utf-8"), styles, [workflow, ai_logic], skip_front_matter=True))

    for label, path in APPENDICES:
        story.append(PageBreak())
        story.append(Paragraph(plain(label), styles["appendix_title"]))
        story.append(Paragraph("Supporting report included from the current repository documentation.", styles["status"]))
        story.extend(parse_markdown(path.read_text(encoding="utf-8"), styles, [], skip_leading_title=True))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, leftMargin=19 * mm, rightMargin=19 * mm,
        topMargin=25 * mm, bottomMargin=24 * mm,
        title="InterviewMate Case Study, Reports and Engineering Handoff",
        author="InterviewMate Product Sprint",
        subject="Current MVP submission package",
    )
    document.build(story, onFirstPage=draw_chrome, onLaterPages=draw_chrome)
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUTPUT, PUBLIC_OUTPUT)

    import pypdfium2 as pdfium

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(OUTPUT))
    for page_number in range(len(pdf)):
        pdf[page_number].render(scale=1.35).to_pil().save(PREVIEW_DIR / f"page-{page_number + 1}.png")
    print(f"Built {len(pdf)} pages: {OUTPUT}")


if __name__ == "__main__":
    main()
