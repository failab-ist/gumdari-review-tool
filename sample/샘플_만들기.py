# -*- coding: utf-8 -*-
"""
검대리 공개판 — 샘플 가이드 / 샘플 원고 생성기

가상 브랜드 「래온셀」 캠페인 자료를 만든다.
브랜드·제품·기능명은 전부 아래 BRAND 상수에 모여 있어서,
이름을 바꾸고 싶으면 이 블록만 고치고 다시 돌리면 된다.

산출물 (out/ 폴더)
  샘플_가이드.pptx            실무형 캠페인 가이드 (표 구조)
  샘플_가이드.docx            같은 내용 워드판
  샘플원고_블로그.docx        블로그 원고 1인분 (위반 7종 삽입)
  샘플원고_인스타.pptx        인스타 원고 3인 합본 (사람별 위반)
  샘플원고_영상기획안.xlsx    영상 기획안 (xlsx 대응 작업의 테스트 대상)
"""

import os
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pptx import Presentation
from pptx.util import Inches, Pt as PPt
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

# ══════════════════════════════════════════════════════════════
#  브랜드 스펙 — 여기만 고치면 전체가 바뀐다
# ══════════════════════════════════════════════════════════════

BRAND = {
    "brand_ko": "래온셀",
    "brand_en": "RAEONCELL",
    "campaign": "2026 래온셀 배리어 크림 체험단",
    "manager": "담당 AE",

    # 제품 정식 표기 (제품명 검사용) — canon / 흔한 오표기
    "products": [
        ("래온셀 배리어 크림", "래온쉘, 래온셀크림, 래온셀 베리어 크림"),
        ("딥배리어 세럼", "딥베리어 세럼, 딥 배리어세럼"),
    ],

    # 붙여 써야 하는 기능명 (AI가 맞춤법 오류로 잡지 않게 보호)
    "proper": ["딥배리어", "트리플히알론", "시카리페어", "나이트리커버리", "마이크로수분캡슐"],

    # 필수 고지 문구 사전 — 기능명 → 함께 들어가야 할 문구
    "notices": [
        ("딥배리어",
         "* 개인의 피부 상태와 사용 환경에 따라 체감 효과가 다를 수 있습니다."),
        ("트리플히알론",
         "* 보습 지속 시간은 자사 시험 조건 기준이며 실제 사용 환경에 따라 달라질 수 있습니다."),
        ("시카리페어",
         "* 진정은 화장품의 일반적인 사용감을 의미하며 의학적 치료 효과가 아닙니다."),
        ("나이트리커버리",
         "* 피부 결 개선은 화장품법상 기능성 심사를 받은 범위에 한합니다."),
    ],

    # 쓰면 안 되는 고지 문구 (이전 시즌 문구 / 실증 불가 표현)
    "banned_notices": [
        "* 임상시험에서 피부 재생률 98% 개선이 확인되었습니다.",
        "* 민감성 피부도 부작용 없이 사용 가능합니다.",
    ],

    "req_tags": ["#래온셀", "#래온셀배리어크림", "#딥배리어세럼"],
    "pick_tags": ["#속건조", "#환절기스킨케어", "#수분장벽"],
    "ad_notice": "본 콘텐츠는 래온셀로부터 제품을 제공받아 작성되었습니다.",
    "lead_text": "래온셀 배리어 크림",
    "target": "20대 후반~30대 초반 직장인. 환절기 속건조와 잦은 화장 들뜸으로 고민하는 층",

    # 가상 경쟁 브랜드 (전부 실존하지 않는 이름)
    "rivals": ["비오나르", "BIONARR", "셀피오", "CELPIO", "아쿠아벨", "AQUABELLE", "더마루체"],

    # 화장품 업종 기준 최상급·과장 표현
    "hype": [
        "세계 최초", "국내 최초", "국내 유일", "업계 1위", "판매 1위",
        "압도적", "완벽한", "완벽하게", "부작용 없는", "무해한",
        "100% 천연", "무독성", "즉시 효과", "완치", "여드름 치료",
        "주름 제거", "아토피 개선", "시술급", "병원급",
    ],

    "img_checks": [
        "타사 제품·로고가 함께 찍히지 않았는지",
        "제품 라벨과 용기 표기가 가려지지 않았는지",
        "사용 전후 비교 컷으로 오인될 구도가 아닌지",
        "과도한 보정으로 피부 표현이 왜곡되지 않았는지",
    ],

    # 플랫폼 — 공개판 프리셋 3행
    "platforms": [
        # 이름, 최소 글자, 최소 이미지, 최소 영상, 파일 추천
        ("블로그", 3000, 15, 0, "docx"),
        ("인스타그램", 800, 6, 1, "pptx"),
        ("영상 기획안", 500, 0, 1, "xlsx"),
    ],

    "rounds": [
        ("1주차", "첫인상과 제형 소개. 개봉부터 첫 사용까지의 과정을 담고, 왜 이 제품을 쓰게 됐는지 본인 피부 고민과 연결할 것", "딥배리어, 마이크로수분캡슐"),
        ("2주차", "2주 사용 후기. 아침저녁 루틴에서 언제 어떻게 썼는지 구체적으로. 변화가 없었다면 없었다고 써도 됨", "트리플히알론"),
        ("3주차", "데일리 루틴 접목. 기존에 쓰던 다른 단계 제품과 어떻게 조합했는지", "시카리페어"),
        ("4주차", "최종 후기와 재구매 의사. 아쉬운 점도 반드시 한 가지 이상 포함", "나이트리커버리"),
    ],

    # 인스타 합본에 들어갈 가상 계정
    "creators": ["dayli_seo", "min_skincare", "hyunwoo.log"],
}

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)
B = BRAND


# ══════════════════════════════════════════════════════════════
#  공용
# ══════════════════════════════════════════════════════════════

def set_doc_font(doc, name="맑은 고딕", size=10):
    style = doc.styles["Normal"]
    style.font.name = name
    style.font.size = Pt(size)
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    rfonts.set(
        "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}eastAsia", name
    )


def docx_table(doc, rows, widths=None, header=True):
    """2차원 리스트를 워드 표로."""
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = "Table Grid"
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = t.cell(ri, ci)
            cell.text = str(val)
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
                    if header and ri == 0:
                        r.font.bold = True
            if widths:
                cell.width = Cm(widths[ci])
    doc.add_paragraph()
    return t


def pptx_blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def pptx_text(slide, text, left, top, width, height, size=12, bold=False):
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    lines = text.split("\n")
    tf.text = lines[0]
    for extra in lines[1:]:
        tf.add_paragraph().text = extra
    for p in tf.paragraphs:
        for r in p.runs:
            r.font.size = PPt(size)
            r.font.bold = bold
            r.font.name = "맑은 고딕"
    return box


def pptx_table(slide, rows, left, top, width, height, size=9):
    shape = slide.shapes.add_table(
        len(rows), len(rows[0]), Inches(left), Inches(top), Inches(width), Inches(height)
    )
    table = shape.table
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = table.cell(ri, ci)
            cell.text = str(val)
            for p in cell.text_frame.paragraphs:
                for r in p.runs:
                    r.font.size = PPt(size)
                    r.font.name = "맑은 고딕"
                    r.font.bold = (ri == 0)
    return table


# ══════════════════════════════════════════════════════════════
#  1. 샘플 가이드 — PPTX
# ══════════════════════════════════════════════════════════════

def build_guide_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # 표지
    s = pptx_blank(prs)
    pptx_text(s, B["campaign"], 0.8, 2.4, 11.5, 1.0, size=32, bold=True)
    pptx_text(s, "크리에이터 콘텐츠 가이드 v1.2", 0.8, 3.4, 11.5, 0.5, size=16)
    pptx_text(s, f"{B['brand_ko']} 마케팅팀 · 2026.03", 0.8, 4.0, 11.5, 0.5, size=12)

    # 캠페인 개요
    s = pptx_blank(prs)
    pptx_text(s, "1. 캠페인 개요", 0.7, 0.5, 11.5, 0.6, size=24, bold=True)
    pptx_table(s, [
        ["구분", "내용"],
        ["캠페인명", B["campaign"]],
        ["기간", "2026년 3월 16일 ~ 5월 10일 (8주)"],
        ["타깃", B["target"]],
        ["모집 인원", "블로그 20명 / 인스타그램 30명 / 영상 8명"],
        ["콘텐츠 수", "1인당 4회차 (주 1회 업로드)"],
    ], 0.7, 1.3, 11.9, 3.2)

    # 플랫폼별 기준
    s = pptx_blank(prs)
    pptx_text(s, "2. 플랫폼별 필수 기준", 0.7, 0.5, 11.5, 0.6, size=24, bold=True)
    rows = [["플랫폼", "최소 글자 수", "최소 이미지 수", "최소 영상 수", "제출 형식"]]
    for name, ch, im, vd, ext in B["platforms"]:
        rows.append([
            name,
            f"{ch:,}자 이상",
            f"{im}장 이상" if im else "해당 없음",
            f"영상 {vd}개" if vd else "해당 없음",
            f".{ext}",
        ])
    pptx_table(s, rows, 0.7, 1.3, 11.9, 2.4)
    pptx_text(s,
              "· 글자 수는 해시태그와 광고 고지 문구를 제외하고 셉니다.\n"
              "· 이미지는 본인이 직접 촬영한 것만 인정합니다. 제공 이미지 사용은 별도 협의.\n"
              "· 영상 기획안은 씬 단위로 나눠 제출해 주세요.",
              0.7, 4.0, 11.9, 1.5, size=12)

    # 광고 고지
    s = pptx_blank(prs)
    pptx_text(s, "3. 광고 고지", 0.7, 0.5, 11.5, 0.6, size=24, bold=True)
    pptx_text(s, "모든 콘텐츠 본문 상단에 아래 문구를 그대로 넣어 주세요.",
              0.7, 1.3, 11.9, 0.5, size=14)
    pptx_text(s, B["ad_notice"], 0.7, 1.9, 11.9, 0.6, size=18, bold=True)
    pptx_text(s,
              "· 본문 시작 400자 안에 있어야 합니다.\n"
              "· 더보기 버튼에 가려지지 않도록 첫 문단에 배치해 주세요.\n"
              "· 표기 방식은 플랫폼 정책을 따르되, 문구 내용은 위와 동일해야 합니다.",
              0.7, 2.8, 11.9, 1.5, size=12)

    # 표기법
    s = pptx_blank(prs)
    pptx_text(s, "4. 제품명 표기법", 0.7, 0.4, 11.5, 0.6, size=24, bold=True)
    rows = [["구분", "올바른 표기", "잘못된 표기"]]
    for canon, wrong in B["products"]:
        rows.append(["제품", f"{canon} (O)", " / ".join(f"{w} (X)" for w in wrong.split(", "))])
    rows.append(["브랜드", f"{B['brand_ko']} (O) / {B['brand_en']} (O)", "라온쎌 (X) / 라온 셀 (X)"])
    rows.append(["기능명", " / ".join(B["proper"]), "띄어 쓰지 마세요"])
    pptx_table(s, rows, 0.7, 1.2, 11.9, 2.6)
    pptx_text(s, "※ 기능명은 모두 붙여 씁니다. 맞춤법 검사기가 띄어쓰기를 제안해도 그대로 두세요.",
              0.7, 4.1, 11.9, 0.5, size=12)

    # 필수 고지 문구
    s = pptx_blank(prs)
    pptx_text(s, "5. 필수 고지 문구", 0.7, 0.4, 11.5, 0.6, size=24, bold=True)
    pptx_text(s, "아래 기능을 언급하면 같은 게시물 안에 해당 문구를 반드시 함께 넣어 주세요.",
              0.7, 1.05, 11.9, 0.4, size=12)
    rows = [["기능명", "필수 고지 문구"]]
    for name, body in B["notices"]:
        rows.append([f"[{name}]", body])
    pptx_table(s, rows, 0.7, 1.55, 11.9, 2.8)
    pptx_text(s,
              "· 문구 앞에는 * 를 붙이고, 그 위에 [기능명]을 표기합니다.\n"
              "· 문구는 한 글자도 바꾸지 말고 그대로 옮겨 주세요.\n"
              "· 같은 문구를 한 게시물에 두 번 넣지 않습니다.",
              0.7, 4.6, 11.9, 1.2, size=12)

    # 금지 고지 문구
    s = pptx_blank(prs)
    pptx_text(s, "6. 사용 금지 문구", 0.7, 0.5, 11.5, 0.6, size=24, bold=True)
    pptx_text(s, "아래 문구는 이전 시즌 문구이거나 실증 자료가 없어 사용할 수 없습니다.",
              0.7, 1.2, 11.9, 0.4, size=12)
    rows = [["금지 문구", "사유"]]
    rows.append([B["banned_notices"][0], "실증 자료 미보유. 수치 표현 불가"])
    rows.append([B["banned_notices"][1], "부작용 없음은 화장품 광고에 쓸 수 없는 표현"])
    pptx_table(s, rows, 0.7, 1.7, 11.9, 1.6)
    pptx_text(s,
              "다음 표현도 피해 주세요 — " + ", ".join(B["hype"][:12]),
              0.7, 3.6, 11.9, 1.0, size=12)

    # 해시태그
    s = pptx_blank(prs)
    pptx_text(s, "7. 해시태그", 0.7, 0.5, 11.5, 0.6, size=24, bold=True)
    pptx_table(s, [
        ["구분", "태그", "조건"],
        ["필수", " ".join(B["req_tags"]), "3개 모두 포함"],
        ["선택", " ".join(B["pick_tags"]), "최소 1개 이상 포함"],
    ], 0.7, 1.3, 11.9, 1.6)
    pptx_text(s, "· 필수 태그는 본문 마지막 문단에 모아 주세요.\n"
                 "· 다른 브랜드 태그는 넣지 말아 주세요.",
              0.7, 3.2, 11.9, 1.0, size=12)

    # 회차
    s = pptx_blank(prs)
    pptx_text(s, "8. 회차별 주제", 0.7, 0.4, 11.5, 0.6, size=24, bold=True)
    rows = [["회차", "주제", "핵심 기능"]]
    for name, topic, keys in B["rounds"]:
        rows.append([name, topic, keys])
    pptx_table(s, rows, 0.7, 1.15, 11.9, 3.6)

    # 촬영 주의사항
    s = pptx_blank(prs)
    pptx_text(s, "9. 촬영 주의사항", 0.7, 0.5, 11.5, 0.6, size=24, bold=True)
    body = "\n".join(f"· {x}" for x in B["img_checks"])
    body += "\n· 자연광에서 촬영해 주시고 색보정 필터는 최소한으로 부탁드립니다.\n"
    body += "· 제품이 화면에서 잘리거나 기울지 않게 수평을 맞춰 주세요."
    pptx_text(s, body, 0.7, 1.3, 11.9, 3.5, size=14)

    # 타사 언급
    s = pptx_blank(prs)
    pptx_text(s, "10. 타 브랜드 언급", 0.7, 0.5, 11.5, 0.6, size=24, bold=True)
    pptx_text(s,
              "본문과 사진 어디에도 타 브랜드가 드러나지 않게 해 주세요.\n\n"
              "특히 이번 캠페인에서 주의할 브랜드\n"
              + ", ".join(B["rivals"]) +
              "\n\n· 화장대 컷을 찍을 때 다른 브랜드 용기가 함께 나오지 않는지 확인해 주세요.\n"
              "· 비교 표현(A보다 좋다, B와 달리)은 직접·간접 모두 사용할 수 없습니다.",
              0.7, 1.3, 11.9, 4.0, size=14)

    path = os.path.join(OUT, "샘플_가이드.pptx")
    prs.save(path)
    return path


# ══════════════════════════════════════════════════════════════
#  2. 샘플 가이드 — DOCX
# ══════════════════════════════════════════════════════════════

def build_guide_docx():
    doc = Document()
    set_doc_font(doc)

    h = doc.add_paragraph(B["campaign"])
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h.runs[0].font.size = Pt(20)
    h.runs[0].font.bold = True
    sub = doc.add_paragraph("크리에이터 콘텐츠 가이드 v1.2")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph()

    def head(t):
        p = doc.add_paragraph(t)
        p.runs[0].font.size = Pt(13)
        p.runs[0].font.bold = True

    head("1. 캠페인 개요")
    docx_table(doc, [
        ["구분", "내용"],
        ["캠페인명", B["campaign"]],
        ["기간", "2026년 3월 16일 ~ 5월 10일 (8주)"],
        ["타깃", B["target"]],
        ["콘텐츠 수", "1인당 4회차 (주 1회 업로드)"],
    ], widths=[3.5, 12.5])

    head("2. 플랫폼별 필수 기준")
    rows = [["플랫폼", "최소 글자 수", "최소 이미지 수", "최소 영상 수", "제출 형식"]]
    for name, ch, im, vd, ext in B["platforms"]:
        rows.append([name, f"{ch:,}자 이상", f"{im}장 이상" if im else "해당 없음",
                     f"영상 {vd}개" if vd else "해당 없음", f".{ext}"])
    docx_table(doc, rows, widths=[3.2, 3.2, 3.2, 3.2, 3.2])

    head("3. 광고 고지")
    doc.add_paragraph("모든 콘텐츠 본문 상단 400자 안에 아래 문구를 그대로 넣어 주세요.")
    p = doc.add_paragraph(B["ad_notice"])
    p.runs[0].font.bold = True
    doc.add_paragraph()

    head("4. 제품명 표기법")
    rows = [["구분", "올바른 표기", "잘못된 표기"]]
    for canon, wrong in B["products"]:
        rows.append(["제품", f"{canon} (O)", " / ".join(f"{w} (X)" for w in wrong.split(", "))])
    rows.append(["브랜드", f"{B['brand_ko']} (O)", "라온쎌 (X) / 라온 셀 (X)"])
    rows.append(["기능명", " / ".join(B["proper"]), "띄어 쓰지 마세요"])
    docx_table(doc, rows, widths=[2.5, 7.0, 6.5])

    head("5. 필수 고지 문구")
    doc.add_paragraph("아래 기능을 언급하면 같은 게시물 안에 해당 문구를 반드시 함께 넣어 주세요.")
    rows = [["기능명", "필수 고지 문구"]]
    for name, body in B["notices"]:
        rows.append([f"[{name}]", body])
    docx_table(doc, rows, widths=[4.0, 12.0])
    doc.add_paragraph("문구 앞에는 * 를 붙이고, 그 위에 [기능명]을 표기합니다. 한 글자도 바꾸지 마세요.")
    doc.add_paragraph()

    head("6. 사용 금지 문구")
    rows = [["금지 문구", "사유"]]
    rows.append([B["banned_notices"][0], "실증 자료 미보유"])
    rows.append([B["banned_notices"][1], "부작용 없음은 화장품 광고에 쓸 수 없는 표현"])
    docx_table(doc, rows, widths=[10.0, 6.0])
    doc.add_paragraph("다음 표현도 피해 주세요 — " + ", ".join(B["hype"][:12]))
    doc.add_paragraph()

    head("7. 해시태그")
    docx_table(doc, [
        ["구분", "태그", "조건"],
        ["필수", " ".join(B["req_tags"]), "3개 모두 포함"],
        ["선택", " ".join(B["pick_tags"]), "최소 1개 이상"],
    ], widths=[2.5, 9.5, 4.0])

    head("8. 회차별 주제")
    rows = [["회차", "주제", "핵심 기능"]]
    for name, topic, keys in B["rounds"]:
        rows.append([name, topic, keys])
    docx_table(doc, rows, widths=[2.0, 10.0, 4.0])

    head("9. 촬영 주의사항")
    for x in B["img_checks"]:
        doc.add_paragraph("· " + x)
    doc.add_paragraph("· 자연광에서 촬영해 주시고 색보정 필터는 최소한으로 부탁드립니다.")
    doc.add_paragraph()

    head("10. 타 브랜드 언급")
    doc.add_paragraph("본문과 사진 어디에도 타 브랜드가 드러나지 않게 해 주세요.")
    doc.add_paragraph("이번 캠페인에서 특히 주의할 브랜드 — " + ", ".join(B["rivals"]))
    doc.add_paragraph("비교 표현(A보다 좋다, B와 달리)은 직접·간접 모두 사용할 수 없습니다.")

    path = os.path.join(OUT, "샘플_가이드.docx")
    doc.save(path)
    return path


# ══════════════════════════════════════════════════════════════
#  3. 샘플 원고 — 블로그 (DOCX)
#     의도적으로 심은 위반
#       ① 제품명 오표기 「래온쉘」
#       ② 타사 브랜드 「비오나르」 언급
#       ③ 최상급 표현 「완벽한」
#       ④ 금지 고지 문구 삽입
#       ⑤ 트리플히알론 언급했는데 필수 고지 문구 누락
#       ⑥ 필수 해시태그 #딥배리어세럼 누락
#       ⑦ 최소 글자 수 미달 (3000자 기준)
# ══════════════════════════════════════════════════════════════

BLOG_BODY = [
    B["ad_notice"],
    "",
    "환절기만 되면 볼 쪽이 당기고 화장이 들뜨는 게 몇 년째 반복이라, 이번엔 크림부터 바꿔보기로 했습니다. "
    "그래서 고른 게 래온셀 배리어 크림이에요.",
    "",
    "■ 개봉하자마자 든 생각",
    "",
    "택배 뜯고 제일 먼저 본 건 용기였어요. 유리 재질이라 묵직하고, 뚜껑 돌리는 감이 헐겁지 않습니다. "
    "스파츌러가 따로 들어 있는 것도 좋았어요. 손가락으로 퍼 쓰다 보면 아무래도 신경 쓰이니까요.",
    "",
    "제형은 생각보다 단단합니다. 겉으로는 꾸덕해 보이는데 손등에 올려서 문지르면 금방 풀려요. "
    "제가 예전에 쓰던 래온쉘 제품이랑은 확실히 다른 느낌이었습니다.",
    "",
    "■ 딥배리어라는 게 뭔가 해서",
    "",
    "설명을 보니 딥배리어라는 게 피부 표면에 얇은 막을 만들어주는 개념이더라고요. "
    "발랐을 때 겉은 보송한데 안쪽은 촉촉한 느낌이 이거 때문인가 싶었습니다.",
    "",
    "[딥배리어]",
    "* 개인의 피부 상태와 사용 환경에 따라 체감 효과가 다를 수 있습니다.",
    "",
    "■ 일주일 써보고",
    "",
    "아침에 바르고 나서 화장할 때가 제일 체감됐어요. 예전엔 파운데이션 올리고 두 시간쯤 지나면 "
    "코 옆이 들떴는데 그게 좀 늦춰졌습니다. 완벽한 해결은 아니지만 확실히 나아졌어요.",
    "",
    "트리플히알론 성분이 들어 있다고 해서 그 부분도 기대했는데, 저는 밤에 바르고 잤을 때가 "
    "아침보다 더 좋았어요. 자고 일어나면 얼굴 만졌을 때 촉촉함이 남아 있습니다.",
    "",
    "* 민감성 피부도 부작용 없이 사용 가능합니다.",
    "",
    "■ 아쉬운 점",
    "",
    "향이 거의 없는 편이라 향 좋아하시는 분들은 심심할 수 있어요. 저는 오히려 좋았지만요. "
    "그리고 용량 대비 가격이 저렴한 편은 아닙니다. 예전에 쓰던 비오나르 크림이 비슷한 용량에 "
    "더 쌌던 걸로 기억해요.",
    "",
    "■ 정리하면",
    "",
    "환절기 속건조로 고민이시라면 한 번 써볼 만합니다. 다만 극건성이신 분들은 이거 하나로 "
    "끝내기보다 세럼을 같이 쓰시는 게 나을 것 같아요.",
    "",
    "#래온셀 #래온셀배리어크림 #속건조 #환절기스킨케어",
]


def build_blog_docx():
    doc = Document()
    set_doc_font(doc, size=11)
    for line in BLOG_BODY:
        doc.add_paragraph(line)
    path = os.path.join(OUT, "샘플원고_블로그.docx")
    doc.save(path)
    return path


# ══════════════════════════════════════════════════════════════
#  4. 샘플 원고 — 인스타 3인 합본 (PPTX)
#     사람별로 다른 위반을 심는다
# ══════════════════════════════════════════════════════════════

INSTA = [
    {
        "who": B["creators"][0],
        # 위반: 없음 (통과 케이스 — 회귀 테스트에 정상 케이스가 있어야 한다)
        "mention": (
            f"{B['ad_notice']}\n\n"
            "환절기마다 볼이 당겨서 크림만 세 번째 바꾸는 중.\n"
            "이번엔 래온셀 배리어 크림으로 정착할 것 같아요.\n\n"
            "제형이 꾸덕한데 문지르면 바로 풀려서\n"
            "아침에 화장 전에 발라도 밀리지 않아요.\n"
            "밤에 두껍게 올리고 자면 다음날 아침이 확실히 달라요.\n\n"
            "2주째 쓰는 중인데 아직은 만족합니다.\n\n"
            "#래온셀 #래온셀배리어크림 #딥배리어세럼 #속건조"
        ),
        "notice": "[딥배리어]\n* 개인의 피부 상태와 사용 환경에 따라 체감 효과가 다를 수 있습니다.",
        "imgs": ["01번 제품 단독컷", "02번 제형 손등컷", "03번 화장대 배치컷",
                 "04번 사용 장면", "05번 아침 루틴", "06번 마무리컷"],
    },
    {
        "who": B["creators"][1],
        # 위반: 제품명 오표기 「딥베리어 세럼」 + 필수 태그 누락 + 고지 문구 누락
        "mention": (
            f"{B['ad_notice']}\n\n"
            "속건조 심한 편이라 세럼을 늘 같이 써요.\n"
            "이번에 받은 딥베리어 세럼이랑 배리어 크림 같이 써봤습니다.\n\n"
            "트리플히알론이 들어 있다고 해서 기대했는데\n"
            "확실히 겉돌지 않고 흡수가 빨라요.\n"
            "저녁에 바르고 자면 아침까지 촉촉함이 남습니다.\n\n"
            "#래온셀 #속건조 #수분장벽"
        ),
        "notice": "",
        "imgs": ["01번 세럼+크림 함께", "02번 제형 비교", "03번 밤 루틴", "04번 아침 피부"],
    },
    {
        "who": B["creators"][2],
        # 위반: 타사 브랜드 언급 + 최상급 표현 + 광고 고지 누락
        "mention": (
            "환절기 스킨케어 바꾼 후기 남겨요.\n\n"
            "예전에 셀피오 크림 쓸 땐 오후만 되면 각질이 일어났는데\n"
            "래온셀 배리어 크림으로 바꾸고 나서 그게 없어졌어요.\n"
            "시카리페어 덕분인지 붉은기도 줄어든 느낌.\n\n"
            "제가 써본 것 중에 압도적으로 좋았습니다.\n\n"
            "#래온셀 #래온셀배리어크림 #딥배리어세럼 #환절기스킨케어"
        ),
        "notice": "[시카리페어]\n* 진정은 화장품의 일반적인 사용감을 의미하며 의학적 치료 효과가 아닙니다.",
        "imgs": ["01번 제품컷", "02번 사용 전", "03번 사용 후", "04번 루틴 전체",
                 "05번 텍스처", "06번 마무리"],
    },
]


def build_insta_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # 표지
    s = pptx_blank(prs)
    pptx_text(s, B["campaign"], 0.8, 2.6, 11.5, 0.8, size=30, bold=True)
    pptx_text(s, "인스타그램 2주차 원고 취합본", 0.8, 3.5, 11.5, 0.5, size=16)
    pptx_text(s, f"제출 3명 · {B['manager']}", 0.8, 4.1, 11.5, 0.5, size=12)

    for person in INSTA:
        # 사람 표지 슬라이드 — "{계정}님" 형태
        s = pptx_blank(prs)
        pptx_text(s, f"{person['who']}님", 0.8, 3.0, 11.5, 0.8, size=36, bold=True)
        pptx_text(s, "2주차 원고", 0.8, 3.9, 11.5, 0.5, size=16)

        # 원고 본문 슬라이드 — 표 구조
        s = pptx_blank(prs)
        pptx_text(s, f"{person['who']}님 — 2주차", 0.6, 0.35, 11.9, 0.5, size=18, bold=True)
        pptx_table(s, [
            ["본문 내용", "필수 고지 문구"],
            [person["mention"], person["notice"] or "(없음)"],
        ], 0.6, 1.0, 11.9, 4.3, size=10)
        pptx_table(s, [
            ["이미지 순서", "수정 요청"],
            ["\n".join(person["imgs"]), ""],
        ], 0.6, 5.5, 11.9, 1.5, size=9)

    path = os.path.join(OUT, "샘플원고_인스타.pptx")
    prs.save(path)
    return path


# ══════════════════════════════════════════════════════════════
#  5. 샘플 원고 — 영상 기획안 (XLSX)
#     현재 도구는 못 읽는다. 3번 작업(xlsx 대응)의 테스트 대상.
# ══════════════════════════════════════════════════════════════

VIDEO_SCENES = [
    ("S1", "0:00–0:05", "제품 클로즈업, 뚜껑 여는 손",
     "환절기마다 볼 당기는 분들 주목.", "", ""),
    ("S2", "0:05–0:15", "세면대 앞 인물 정면",
     f"{B['ad_notice']} 오늘은 래온셀 배리어 크림 2주 써본 얘기 해볼게요.", "", ""),
    ("S3", "0:15–0:35", "제형 손등 클로즈업",
     "제형이 꾸덕한데 문지르면 바로 풀려요. 딥배리어라고 해서 표면에 얇은 막을 만들어주는 개념이래요.",
     "[딥배리어]\n* 개인의 피부 상태와 사용 환경에 따라 체감 효과가 다를 수 있습니다.", ""),
    ("S4", "0:35–0:55", "아침 화장 장면",
     "예전엔 두 시간이면 코 옆이 들떴는데 그게 늦춰졌어요. 완벽한 해결은 아니지만요.",
     "", "「완벽한」 표현 확인 필요"),
    ("S5", "0:55–1:15", "밤 루틴, 조명 낮춤",
     "트리플히알론 들어 있어서 밤에 바르고 자면 아침까지 촉촉함이 남습니다.",
     "", "트리플히알론 고지 문구 누락"),
    ("S6", "1:15–1:30", "제품 단독 마무리컷",
     "아쉬운 건 가격이에요. 아쿠아벨 제품이 비슷한 용량에 더 쌌어요.",
     "", "타사 브랜드 언급"),
    ("S7", "1:30–1:40", "자막 아웃트로",
     "#래온셀 #래온셀배리어크림 #딥배리어세럼 #속건조", "", ""),
]


def build_video_xlsx():
    wb = Workbook()

    thin = Side(style="thin", color="BBBBBB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    head_fill = PatternFill("solid", fgColor="E8EEF9")

    # 시트 1 — 기획안 본문
    ws = wb.active
    ws.title = "영상 기획안"
    headers = ["씬", "타임코드", "화면 구성", "대본", "필수 고지 문구", "수정 요청"]
    ws.append(headers)
    for row in VIDEO_SCENES:
        ws.append(list(row))

    widths = [6, 14, 30, 60, 45, 24]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    for c in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=c)
        cell.font = Font(name="맑은 고딕", size=10, bold=True)
        cell.fill = head_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border
    for r in range(2, ws.max_row + 1):
        ws.row_dimensions[r].height = 60
        for c in range(1, len(headers) + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = Font(name="맑은 고딕", size=10)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = border

    # 시트 2 — 제출 정보
    ws2 = wb.create_sheet("제출 정보")
    info = [
        ["항목", "내용"],
        ["캠페인", B["campaign"]],
        ["플랫폼", "영상 기획안 (유튜브·틱톡·릴스)"],
        ["회차", "2주차"],
        ["크리에이터", B["creators"][0]],
        ["제출일", "2026-03-30"],
        ["영상 길이", "1분 40초"],
        ["필수 해시태그", " ".join(B["req_tags"])],
    ]
    for row in info:
        ws2.append(row)
    ws2.column_dimensions["A"].width = 18
    ws2.column_dimensions["B"].width = 60
    for c in range(1, 3):
        cell = ws2.cell(row=1, column=c)
        cell.font = Font(name="맑은 고딕", size=10, bold=True)
        cell.fill = head_fill
    for r in range(1, ws2.max_row + 1):
        for c in range(1, 3):
            cell = ws2.cell(row=r, column=c)
            if not cell.font.bold:
                cell.font = Font(name="맑은 고딕", size=10)
            cell.border = border
            cell.alignment = Alignment(vertical="center", wrap_text=True)

    path = os.path.join(OUT, "샘플원고_영상기획안.xlsx")
    wb.save(path)
    return path


# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    made = [
        build_guide_pptx(),
        build_guide_docx(),
        build_blog_docx(),
        build_insta_pptx(),
        build_video_xlsx(),
    ]
    for p in made:
        print("생성:", os.path.basename(p), os.path.getsize(p), "bytes")
