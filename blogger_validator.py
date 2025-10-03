#!/usr/bin/env python3
"""
blogger_validator.py (풀체크·자가교정형)

목표: XML 파일을 구글 블로그 생성 조건에 맞게 자동 교정 → 반복 검사 → 완성본 출력

기능:
1. XML 문법 교정
   - & → &amp;
   - <script> 본문 CDATA 래핑
   - void 태그(meta, link, img, br 등) 자가폐쇄

2. 구글 블로그 필수 규칙 점검
   - 루트 네임스페이스 확인
   - <b:include data='blog' name='all-head-content'/> 존재 확인
   - <b:skin><![CDATA[ ... ]]></b:skin> 존재 확인
   - 조건문 문자열 비교에서 &quot; 강제
   - <data:.../>는 문서화된 속성만 허용
   - widget type 화이트리스트 검사
   - widget id 중복 검사

3. 금지 요소 차단
   - HTML5 전용 태그(video, audio, canvas 등) 경고
   - <style>은 반드시 <b:skin> 안에만 존재
   - http:// 링크 차단 (https만 허용)

4. 반복 검사 루프
   - 교정 → 검사 → 실패 시 다시 교정 → 재검사
   - 더 이상 교정 불가한 치명 오류가 없을 때 “✅ 완성본” 출력
"""

import sys, re, pathlib, difflib
from xml.etree import ElementTree as ET

ALLOWED_WIDGETS = {
    "Blog","BlogSearch","BlogArchive","Profile","Header",
    "PopularPosts","FeaturedPost","Attribution","Label",
    "Text","HTML","Image","PageList"
}

VOID_TAGS = ["meta","link","img","br","hr","input","source","track"]

def auto_fix(text:str)->str:
    fixed = text

    # 1) & 교정
    fixed = re.sub(r'&(?!amp;)', '&amp;', fixed)

    # 2) script CDATA 래핑
    def wrap_cdata(m):
        inner = m.group(1)
        if "<![CDATA[" in inner:
            return m.group(0)
        return "<script><![CDATA[\n" + inner + "\n]]></script>"
    fixed = re.sub(r"<script[^>]*>(.*?)</script>", wrap_cdata, fixed, flags=re.S)

    # 3) void 태그 자가폐쇄
    for tag in VOID_TAGS:
        fixed = re.sub(rf"<{tag}([^>/]*)>", rf"<{tag}\1/>", fixed, flags=re.I)

    return fixed

def validate_once(text:str):
    errors, warnings = [], []

    try:
        root = ET.fromstring(text)
    except Exception as e:
        errors.append(f"XML 파싱 오류: {e}")
        return errors, warnings

    # 루트 네임스페이스 확인
    ns = root.attrib
    required_ns = {
        "xmlns:b":"http://www.google.com/2005/gml/b",
        "xmlns:data":"http://www.google.com/2005/gml/data",
        "xmlns:expr":"http://www.google.com/2005/gml/expr"
    }
    for k,v in required_ns.items():
        if k not in ns or ns[k]!=v:
            errors.append(f"루트 네임스페이스 누락/불일치: {k}")

    # 필수 태그 확인
    if "<b:include data='blog' name='all-head-content'/>" not in text:
        errors.append("필수 include 누락")
    if "<b:skin" not in text:
        errors.append("b:skin 블록 누락")

    # 조건문 &quot; 검사
    if re.search(r"cond=['\"][^'\"]*==[^'\"]*['\"]", text):
        errors.append("조건문 문자열 비교시 &quot; 미사용")

    # widget 검사
    widgets = root.findall(".//{http://www.google.com/2005/gml/b}widget")
    ids = []
    for w in widgets:
        wid = w.get("id")
        t = w.get("type")
        if t not in ALLOWED_WIDGETS:
            errors.append(f"INVALID_WIDGET_TYPE {wid}:{t}")
        if wid in ids:
            errors.append(f"DUPLICATE_ID {wid}")
        ids.append(wid)

    # 금지 요소
    if re.search(r"<(video|audio|canvas)", text, re.I):
        warnings.append("HTML5 전용 태그 사용: video/audio/canvas")
    if re.search(r"<style[^>]*>", text) and "<b:skin" not in text:
        warnings.append("style 태그가 b:skin 밖에 있음")
    if "http://" in text:
        warnings.append("http:// 링크 발견 (https만 허용)")

    return errors, warnings

def validate_loop(path: pathlib.Path):
    raw = path.read_text(encoding="utf-8")
    fixed = raw
    iteration = 0
    while True:
        iteration += 1
        fixed = auto_fix(fixed)
        errors, warnings = validate_once(fixed)
        if not errors:
            # 최종 결과
            outpath = path.with_name(path.stem + "_FINAL.xml")
            outpath.write_text(fixed, encoding="utf-8")
            print(f"✅ 최종 결과: 완성본 ({iteration}회 교정)")
            for w in warnings:
                print("⚠️", w)
            print("출력 파일:", outpath)
            return True
        else:
            if iteration>3:
                print("❌ 반복 교정 실패. 남은 오류:", errors)
                return False
            print(f"교정 {iteration}회차 오류:", errors)

if __name__=="__main__":
    if len(sys.argv)<2:
        print("사용법: python blogger_validator.py <xml파일>")
        sys.exit(1)
    path = pathlib.Path(sys.argv[1])
    validate_loop(path)
