"""Build the reviewer PDF from editable content; requires reportlab and pypdfium2."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
root = Path(__file__).resolve().parents[1]
content = json.loads((root / 'deliverables/case-study-content.json').read_text(encoding='utf-8'))
out = root / 'deliverables/InterviewMate-Case-Study-and-Handoff.pdf'
green = colors.HexColor('#184C38'); ink=colors.HexColor('#21342D'); muted=colors.HexColor('#56655E')
styles = {
 'kicker':ParagraphStyle('kicker',fontName='Helvetica-Bold',fontSize=9,textColor=green,spaceAfter=18),
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=26,leading=30,textColor=ink,spaceAfter=14),
 'intro':ParagraphStyle('intro',fontName='Helvetica',fontSize=12,leading=17,textColor=green,spaceAfter=22),
 'heading':ParagraphStyle('heading',fontName='Helvetica-Bold',fontSize=10.5,leading=14,textColor=ink,spaceAfter=5),
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=9.5,leading=14,textColor=muted,spaceAfter=16,splitLongWords=True),
}
def clean(text):
 return escape(text.replace('→',' / ').replace('–','-').replace('—','-').replace('’',"'").replace('“','"').replace('”','"'))
def chrome(c,doc):
 w,h=A4;c.setFillColor(colors.HexColor('#F5F7F3'));c.rect(0,0,w,h,fill=1,stroke=0)
 c.setFillColor(green);c.rect(42,h-42,24,4,fill=1,stroke=0);c.setFont('Helvetica-Bold',9);c.drawString(76,h-42,'INTERVIEWMATE / PRODUCT SPRINT')
 c.setStrokeColor(colors.HexColor('#D7E1D8'));c.line(42,48,w-42,48);c.setFont('Helvetica',8);c.setFillColor(muted)
 c.drawString(42,33,'10 September 2026 / Prototype handoff / Live acceptance pending');c.drawRightString(w-42,33,f'{doc.page} / {len(content["pages"])}')
doc=SimpleDocTemplate(str(out),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=76,bottomMargin=65,title='InterviewMate - Case Study and Engineering Handoff',author='InterviewMate Product Sprint')
story=[]
for i,page in enumerate(content['pages']):
 if i:story.append(PageBreak())
 for key in ['kicker','title','intro']:story.append(Paragraph(clean(page[key]),styles[key]))
 for title,text in page['sections']:story.append(KeepTogether([Paragraph(clean(title),styles['heading']),Paragraph(clean(text),styles['body'])]))
doc.build(story,onFirstPage=chrome,onLaterPages=chrome)
import pypdfium2 as pdfium
pdf=pdfium.PdfDocument(str(out));preview=root/'tmp/pdf-review';preview.mkdir(parents=True,exist_ok=True)
for i in range(len(pdf)):pdf[i].render(scale=1.3).to_pil().save(preview/f'page-{i+1}.png')
print(f'Built {len(pdf)} pages: {out}')
