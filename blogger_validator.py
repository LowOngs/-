#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
blogger_validator.py (업데이트판, 풀체크·자가교정형)

목표: Blogger XML 템플릿 자동 교정 → 반복 검사 → 완성본 출력
포함:
- XML 문법 교정: & 이스케이프, <script> CDATA, void 태그 자가폐쇄
- 필수 규칙 점검: 네임스페이스, all-head-content, b:skin
- 조건식 검사: 문자열 비교는 &quot; 또는 \" 허용
- 위젯 검사: 타입 화이트리스트(검색 위젯 Search 포함), ID 중복
- 금지/권장: http://, style의 위치, video/audio/canvas 경고
"""

import sys, re, pathlib
from xml.etree import ElementTree as ET

# Blogger에서 흔히 허용되는 위젯 타입 목록
ALLOWED_WIDGETS = {
    "Blog", "Search", "BlogSearch", "BlogArchive", "Profile", "Header",
    "PopularPosts", "FeaturedPost", "Attribution", "Label",
    "Text", "HTML", "Image", "PageList"
}

# 자가폐쇄해야 하는 빈 태그
VOID_TAGS = ["meta","link","img","br","hr","input","source","track"]

def auto_fix(text: str) -> str:
    fixed = text

    # 1) & 이스케이프: 이미 엔티티(&...;)인 경우는 제외
    fixed = re.sub(r'&(?!#\d+;|#x[0-9A-Fa-f]+;|\w+;)', '&amp;', fixed)

    # 2) <script> 본문을 CDATA로 래핑
    def wrap_cdata(m):
        inner = m.group(1)
        if "<![CDATA[" in inner:
            return m.group(0)
        return "<script><![CDATA[\n" + inner + "\n]]></script>"
    fixed = re.sub(r"<script[^>]*>(.*?)</script>", wrap_cdata, fixed, flags=re.S|re.I)

    # 3) void 태그 자가폐쇄
    for tag in VOID_TAGS:
        fixed = re.sub(rf"<{tag}([^>/]*?)>", rf"<{tag}\1/>", fixed, flags=re.I)

    return fixed

def validate_once(text: str):
    errors, warnings = [], []

    # XML 파싱
    try:
        root = ET.fromstring(text)
    except Exception as e:
        errors.append(f"XML 파싱 오류: {e}")
        return errors, warnings

    # 루트 네임스페이스(텍스트 기반 검사: 중복 선언 오검출 방지)
    required_ns = {
        "xmlns:b":   "http://www.google.com/2005/gml/b",
        "xmlns:data":"http://www.google.com/2005/gml/data",
        "xmlns:expr":"http://www.google.com/2005/gml/expr"
    }
    for k, v in required_ns.items():
        if f"{k}='{v}'" not in text and f'{k}="{v}"' not in text:
            errors.append(f"루트 네임스페이스 누락/불일치: {k}")

    # 필수 요소
    if "<b:include data='blog' name='all-head-content'/>" not in text:
        errors.append("필수 include 누락: <b:include data='blog' name='all-head-content'/>")
    if "<b:skin" not in text:
        errors.append("b:skin 블록 누락")

    # 조건문 문자열 비교 검사: == 가 있을 때 &quot; 또는 \" 허용
    conds = re.findall(r"<b:if[^>]*cond=['\"]([^'\"]+)['\"][^>]*>", text)
    for c in conds:
        if "==" in c and ("&quot;" not in c and '\\"' not in c):
            errors.append("조건문 문자열 비교시 &quot; 또는 \\\" 사용 필요")

    # 위젯 검사
    widgets = root.findall(".//{http://www.google.com/2005/gml/b}widget")
    ids = []
    for w in widgets:
        wid = w.get("id")
        t = w.get("type")
        if t not in ALLOWED_WIDGETS:
            errors.append(f"INVALID_WIDGET_TYPE id={wid}, type={t}")
        if wid in ids:
            errors.append(f"DUPLICATE_ID {wid}")
        ids.append(wid)

    # 금지/권장
    if re.search(r"<(video|audio|canvas)(\s|>)", text, re.I):
        warnings.append("HTML5 전용 태그 사용: video/audio/canvas")
    if re.search(r"<style[^>]*>", text) and "<b:skin" not in text:
        warnings.append("style 태그가 b:skin 밖에 있음")
    if "http://" in text:
        warnings.append("http:// 링크 발견 (https 권장)")

    return errors, warnings

def validate_loop(path: pathlib.Path):
    raw = path.read_text(encoding="utf-8")
    fixed = raw
    for i in range(1, 5):  # 최대 4회 시도
        fixed = auto_fix(fixed)
        errors, warnings = validate_once(fixed)
        if not errors:
            outpath = path.with_name(path.stem + "_FINAL.xml")
            outpath.write_text(fixed, encoding="utf-8")
            print(f"✅ 최종 결과: 완성본 ({i}회 교정)")
            for w in warnings:
                print("⚠️", w)
            print("출력 파일:", outpath)
            return True
        if i == 4:
            print("❌ 반복 교정 실패. 남은 오류:")
            for e in errors:
                print(" -", e)
            return False
        # 다음 루프에서 재교정 계속
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python blogger_validator.py <xml파일>")
        sys.exit(1)
    path = pathlib.Path(sys.argv[1])
    ok = validate_loop(path)
    sys.exit(0 if ok else 2)
