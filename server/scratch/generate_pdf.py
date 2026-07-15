import os
import sys
import re
from fpdf import FPDF

class FreshWayReportPDF(FPDF):
    def __init__(self, running_title):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_margins(left=20, top=20, right=20)
        self.set_auto_page_break(auto=True, margin=20)
        self.running_title = running_title
        
    def header(self):
        if self.page_no() == 1:
            return # Skip header on cover/title page
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(70, 90, 140) # Slate Blue
        self.cell(0, 10, self.running_title, align="R")
        self.ln(10)
        # Horizontal rule below header
        self.set_draw_color(200, 200, 200)
        self.set_line_width(0.2)
        self.line(20, 18, 190, 18)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        # Page number
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def write_paragraph(self, text, font_name="Helvetica", font_style="", font_size=10, text_color=(30, 30, 30), align="L", spacing=5.5, before_space=0, after_space=1):
        """Helper to draw paragraphs via multi_cell and immediately reset x coordinates using ln()."""
        self.set_font(font_name, font_style, font_size)
        self.set_text_color(*text_color)
        if before_space > 0:
            self.ln(before_space)
        self.multi_cell(0, spacing, text, align=align)
        if after_space > 0:
            self.ln(after_space)


def make_latin1_safe(text):
    """Clean and map non-Latin-1 characters and emojis to ASCII descriptors to prevent FPDF crash."""
    replacements = {
        "🐟": "Fish",
        "🛡️": "[Assured]",
        "🛡": "[Assured]",
        "🟢": "(Highly Fresh)",
        "🔵": "(Fresh)",
        "🔴": "(Not Fresh)",
        "🟡": "(Uncertain)",
        "⚪": "(Neutral)",
        "⚖️": "[Weights]",
        "⚖": "[Weights]",
        "📂": "[Loading]",
        "🔄": "[Resuming]",
        "💾": "[Saving]",
        "✅": "[Success]",
        "❌": "[Error]",
        "🎉": "[Complete]",
        "•": "-",
        "–": "-",
        "—": "-",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "π": "pi",
        "Δ": "Delta",
        "±": "+/-",
        "≥": ">=",
        "≤": "<=",
        "≈": "~",
        "°": " degrees ",
    }
    for char, rep in replacements.items():
        text = text.replace(char, rep)
    
    # Strip any remaining emoji/unsupported character range
    safe_chars = []
    for c in text:
        try:
            c.encode("latin-1")
            safe_chars.append(c)
        except UnicodeEncodeError:
            safe_chars.append("?") # fallback for other unicode chars
    
    return "".join(safe_chars)


def parse_and_generate_pdf(md_path, pdf_path, report_type="Technical"):
    print(f"Reading markdown from: {md_path}")
    if not os.path.exists(md_path):
        raise FileNotFoundError(f"Markdown file {md_path} not found!")

    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    running_title = "FreshWay: IoT-Enabled Hybrid AI Fish Quality Evaluation & Routing System"
    if report_type == "Evaluation":
        running_title = "FreshWay: Performance, Statistical Analysis & Experimental Evaluation"
        
    pdf = FreshWayReportPDF(running_title)
    pdf.alias_nb_pages()
    
    # --- PAGE 1: TITLE PAGE ---
    pdf.add_page()
    pdf.ln(25)
    
    # Title
    title_text = "FRESHWAY"
    pdf.write_paragraph(title_text, font_size=24, font_style="B", text_color=(20, 50, 110), align="C", spacing=12, after_space=8)
    
    if report_type == "Technical":
        subtitle_text = "An IoT-Enabled Computer Vision and Deep Learning System for Real-Time Fish Freshness Evaluation and B2B Marketplace Routing"
        pdf.write_paragraph(subtitle_text, font_size=14, font_style="B", text_color=(70, 90, 140), align="C", spacing=8, after_space=20)
    else:
        subtitle_text = "Performance Metrics, Statistical Validation, Significance Testing, and Ablation Analysis"
        pdf.write_paragraph(subtitle_text, font_size=14, font_style="B", text_color=(70, 90, 140), align="C", spacing=8, after_space=20)
        
    # Decorative separator line
    pdf.set_fill_color(20, 50, 110)
    pdf.rect(40, pdf.get_y(), 130, 2, "F")
    pdf.ln(30)
    
    # Author/Role details
    if report_type == "Technical":
        pdf.write_paragraph("TECHNICAL REPORT & ACADEMIC DOCUMENTATION", font_size=12, font_style="B", align="C", after_space=8)
        pdf.write_paragraph("Senior Research Scientist & Software Architect Portfolio", font_size=10, align="C", after_space=2)
        pdf.write_paragraph("Final Year Project (FYP) Submission Document", font_size=10, align="C", after_space=2)
        pdf.write_paragraph("Including IEEE-Style Research Paper & Viva Preparation", font_size=10, align="C", after_space=25)
    else:
        pdf.write_paragraph("EXPERIMENTAL EVALUATION & STATISTICAL REPORT", font_size=12, font_style="B", align="C", after_space=8)
        pdf.write_paragraph("Quantitative Model Metrics, ANOVA/t-test Validation, and Component Ablation", font_size=10, align="C", after_space=2)
        pdf.write_paragraph("Data-Driven Validation Companion Document", font_size=10, align="C", after_space=2)
        pdf.write_paragraph("Performance Testing & Model Generalization Analysis", font_size=10, align="C", after_space=25)
        
    pdf.write_paragraph("Compiled in: Python with FPDF2 PDF Engine", font_size=9, font_style="I", text_color=(100, 100, 100), align="C", after_space=2)
    pdf.write_paragraph("Generated: June 2026", font_size=9, font_style="I", text_color=(100, 100, 100), align="C", after_space=2)

    # Begin reading content lines
    in_code_block = False
    code_content = []
    
    in_table = False
    table_headers = None
    table_rows = []
    
    for line_idx, line in enumerate(lines):
        clean_line = line.strip()
        
        # 1. Handle Code Blocks
        if clean_line.startswith("```"):
            if in_code_block:
                # End of code block, render it
                pdf.set_font("Courier", "", 8.5)
                pdf.set_text_color(30, 80, 30) # Dark Green for code
                pdf.set_fill_color(245, 248, 245) # Light green tint background
                
                # Render code text
                full_code_text = make_latin1_safe("\n".join(code_content))
                pdf.multi_cell(0, 4, full_code_text, border=1, fill=True)
                pdf.ln(4)
                
                # Reset states
                in_code_block = False
                code_content = []
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_content.append(line.rstrip("\n"))
            continue

        # 2. Handle Tables
        if clean_line.startswith("|") and clean_line.endswith("|"):
            in_table = True
            # Parse table columns
            columns = [c.strip() for c in clean_line.split("|")[1:-1]]
            
            # Check if this is a separator line like |---|---|
            is_sep = all(re.match(r"^-+$", c) or c == "" for c in columns)
            if is_sep:
                continue
                
            if not table_headers:
                table_headers = columns
            else:
                table_rows.append(columns)
            continue
        else:
            if in_table:
                # End of table, render it
                if table_headers:
                    # Calculate equal width
                    num_cols = len(table_headers)
                    col_width = 170 / num_cols if num_cols > 0 else 170
                    
                    # Header row
                    pdf.set_font("Helvetica", "B", 8.5)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_fill_color(20, 50, 110) # Navy
                    
                    for h in table_headers:
                        safe_h = make_latin1_safe(h)
                        pdf.cell(col_width, 8, safe_h, border=1, fill=True, align="C")
                    pdf.ln(8)
                    
                    # Data rows
                    pdf.set_font("Helvetica", "", 8)
                    pdf.set_text_color(30, 30, 30)
                    fill_row = False
                    
                    for row in table_rows:
                        pdf.set_fill_color(245, 245, 250 if fill_row else 255)
                        for cell in row:
                            safe_cell = make_latin1_safe(cell)
                            pdf.cell(col_width, 7, safe_cell, border=1, fill=True, align="C")
                        pdf.ln(7)
                        fill_row = not fill_row
                    pdf.ln(4)
                
                # Reset table states
                in_table = False
                table_headers = None
                table_rows = []
                
        # 3. Handle Empty Lines
        if not clean_line:
            pdf.ln(2)
            continue
            
        # 4. Handle Headings
        if clean_line.startswith("#"):
            heading_level = len(clean_line) - len(clean_line.lstrip("#"))
            heading_text = clean_line.lstrip("#").strip()
            safe_text = make_latin1_safe(heading_text)
            
            if heading_level == 1:
                pdf.add_page()
                pdf.ln(5)
                pdf.write_paragraph(safe_text, font_size=18, font_style="B", text_color=(20, 50, 110), spacing=10, after_space=2)
                pdf.set_draw_color(20, 50, 110)
                pdf.set_line_width(0.6)
                pdf.line(20, pdf.get_y(), 190, pdf.get_y())
                pdf.ln(6)
            elif heading_level == 2:
                pdf.write_paragraph(safe_text, font_size=14, font_style="B", text_color=(70, 90, 140), spacing=8, before_space=4, after_space=2)
            elif heading_level == 3:
                pdf.write_paragraph(safe_text, font_size=11, font_style="B", spacing=6, before_space=3, after_space=1.5)
            else:
                pdf.write_paragraph(safe_text, font_size=10, font_style="BI", text_color=(50, 50, 50), spacing=6, before_space=2, after_space=1)
            continue

        # 5. Handle Lists (bullet points and numbered items)
        list_match = re.match(r"^([\-\*\+])\s+(.*)", clean_line)
        num_list_match = re.match(r"^(\d+)\.\s+(.*)", clean_line)
        
        if list_match:
            item_text = list_match.group(2)
            safe_item = make_latin1_safe(item_text)
            pdf.write_paragraph(f"  - {safe_item}", font_size=10, spacing=6, after_space=1)
            continue
            
        if num_list_match:
            num = num_list_match.group(1)
            item_text = num_list_match.group(2)
            safe_item = make_latin1_safe(item_text)
            pdf.write_paragraph(f"  {num}. {safe_item}", font_size=10, spacing=6, after_space=1)
            continue

        # 6. Handle Normal Paragraphs
        safe_line = make_latin1_safe(clean_line)
        pdf.write_paragraph(safe_line, font_size=10, spacing=5.5, after_space=1)

    print(f"Compiling PDF into target file: {pdf_path}")
    pdf.output(pdf_path)
    print("PDF generation successfully completed!")


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # File 1: Technical & Academic Report
    md_file1 = os.path.join(base_dir, "scratch", "FreshWay_Technical_Report.md")
    pdf_file1 = os.path.join(base_dir, "scratch", "FreshWay_Technical_Report.pdf")
    
    # File 2: Experimental Evaluation & Statistical Report
    md_file2 = os.path.join(base_dir, "scratch", "FreshWay_Experimental_Evaluation.md")
    pdf_file2 = os.path.join(base_dir, "scratch", "FreshWay_Experimental_Evaluation.pdf")
    
    try:
        parse_and_generate_pdf(md_file1, pdf_file1, report_type="Technical")
        parse_and_generate_pdf(md_file2, pdf_file2, report_type="Evaluation")
        sys.exit(0)
    except Exception as e:
        print(f"Error compiling report PDFs: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
