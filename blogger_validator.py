#!/usr/bin/env python3
"""
blogger_validator.py (개선판)
구글 블로그 XML 템플릿 검사 + 자동 교정

개선 포인트:
1. & → &amp; 자동 교정
2. <script> 본문 자동 CDATA 래핑
3. 빈 태그(meta, link, img, br 등) 자가폐쇄 자동 교정
4. Blogger 허용 위젯 타입 목록 확장 (Contempo 대응)
5. 오류 등급화 (치명/경고)
6. 수정 결과 diff 보고
"""

import sys, re, pathlib, difflib
from xml.etree import ElementTree as ET

# Blogger에서 흔히 허용되는 위젯 타입 목록
ALLOWED_WIDGETS = {
    "Blog","BlogSearch","BlogArchive","Profile","Header",
    "PopularPosts","FeaturedPost","Attribution","Label",
    "Text","HTML","Image","PageList"
}

def auto_fix(text:str)->str:
    """자동 교정: &, script, void 태그"""
    fixed = text

    # 1) & → &amp; (이미 변환된 &amp;는 건드리지 않음)
    fixed = re.sub(r'&(?!amp;)', '&amp;', fixed)

    # 2) <script> 본문 CDATA 래핑
    def wrap_cdata(m):
        inner = m.group(1)
        if "<![CDATA[" in inner:
            return m.group(0)  # 이미 처리됨
        return "<script><![CDATA[\n" + inner + "\n]]></script>"
    fixed = re.sub(r"<script[^>]*>(.*?)</script>", wrap_cdata, fixed, flags=re.S)

    # 3) 빈 태그 자가폐쇄
    void_tags = ["meta","link","img","br","hr","input","source","track"]
    for tag in void_tags:
        fixed = re.sub(rf"<{tag}([^>/]*)>", rf"<{tag}\1/>", fixed, flags=re.I)

    return fixed

def validate(path: pathlib.Path):
    raw = path.read_text(encoding="utf-8")
    fixed = auto_fix(raw)

    # diff 표시
    if raw != fixed:
        print("자동 교정 적용됨: 원본 대비 변경 발생")
        for line in difflib.unified_diff(raw.splitlines(), fixed.splitlines(),
                                         fromfile="original", tofile="fixed", lineterm=""):
            print(line)

    # XML 파싱 시도
    try:
        root = ET.fromstring(fixed)
    except Exception as e:
        print("❌ XML 파싱 실패:", e)
        return False

    # 위젯 타입 검사
    errors, warnings = [], []
    for w in root.findall(".//{http://www.google.com/2005/gml/b}widget"):
        t = w.get("type")
        wid = w.get("id")
        if t not in ALLOWED_WIDGETS:
            errors.append(f"INVALID_WIDGET_TYPE id={wid}, type={t}")
        # id 중복 검사
    ids = [w.get("id") for w in root.findall(".//{http://www.google.com/2005/gml/b}widget")]
    for d in set([i for i in ids if ids.count(i)>1]):
        errors.append(f"DUPLICATE_ID {d}")

    # 최종 결과 보고
    if errors:
        print("❌ 치명 오류:")
        for e in errors: print(" -", e)
        return False
    if warnings:
        print("⚠️ 경고:")
        for w in warnings: print(" -", w)

    print("✅ 최종 결과: 완성본")
    return True

if __name__=="__main__":
    if len(sys.argv)<2:
        print("사용법: python blogger_validator.py <xml파일>")
        sys.exit(1)
    path = pathlib.Path(sys.argv[1])
    validate(path)
