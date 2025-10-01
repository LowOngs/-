#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
blogger_validator.py
- 단일 루프(자동 교정 반복) 후 단일 최종 결과 출력
- 성공: "최종 결과: 완성본" (그 외 출력 없음)
- 실패: "최종 결과: 실패" 후 원인 분석 및 우회/대체 제안 출력
사용법: python blogger_validator.py target.xml
"""

from __future__ import annotations
import re
import sys
import xml.etree.ElementTree as ET
from typing import List, Tuple

MAX_ITER = 5

# 허용 위젯 타입(필요하면 확장)
ALLOWED_WIDGET_TYPES = {
    "Blog","Profile","Label","BlogSearch","BlogArchive",
    "PopularPosts","FeaturedPost","Attribution","HTML","LinkList"
}

class Issue:
    def __init__(self, code: str, field: str, detail: str):
        self.code = code
        self.field = field
        self.detail = detail

    def __repr__(self):
        return f"Issue({self.code},{self.field},{self.detail})"

class BloggerValidator:
    def __init__(self, xml_text: str):
        self.xml = xml_text

    # ------------------------
    # 자동 교정 루틴들
    # ------------------------
    def fix_ampersands(self):
        # & but not standard entities -> &amp;
        # Protect already escaped common entities
        self.xml = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', self.xml)

    def fix_void_tags(self):
        voids = ["meta","link","img","br","hr","input","source","track"]
        for tag in voids:
            # replace <tag ...> that are not self-closed to <tag ... />
            pattern = re.compile(rf'(<{tag}\b[^>]*?)(?<!/)>', re.IGNORECASE)
            self.xml = pattern.sub(r'\1 />', self.xml)

            # normalize accidental double-slash patterns
            self.xml = re.sub(r'\s*/\s*/>', ' />', self.xml)

    def fix_cdata(self):
        # Wrap script/style contents with CDATA if needed.
        def wrap_script(m):
            tag_open = m.group(1)
            content = m.group(2)
            tag_close = m.group(3)
            if "<![CDATA[" in content:
                return m.group(0)
            return f"{tag_open}/*<![CDATA[*/\n{content}\n/*]]>*/{tag_close}"
        self.xml = re.sub(r'(<script\b[^>]*>)(.*?)(</script>)', wrap_script, self.xml, flags=re.IGNORECASE|re.DOTALL)
        # style
        def wrap_style(m):
            tag_open = m.group(1)
            content = m.group(2)
            tag_close = m.group(3)
            if "<![CDATA[" in content:
                return m.group(0)
            return f"{tag_open}/*<![CDATA[*/\n{content}\n/*]]>*/{tag_close}"
        self.xml = re.sub(r'(<style\b[^>]*>)(.*?)(</style>)', wrap_style, self.xml, flags=re.IGNORECASE|re.DOTALL)

    def fix_conditionals(self):
        # Replace direct " in b:if comparisons with &quot; pattern if found naive
        # e.g. data:blog.pageType == "error_page" -> data:blog.pageType == &quot;error_page&quot;
        self.xml = re.sub(r'(\b==\s*)"([^"]+)"', r'\1&quot;\2&quot;', self.xml)

    def auto_fix_all(self):
        self.fix_ampersands()
        self.fix_void_tags()
        self.fix_cdata()
        self.fix_conditionals()

    # ------------------------
    # 진단 검사들 (문제 목록 반환)
    # ------------------------
    def diagnose(self) -> List[Issue]:
        issues: List[Issue] = []

        # XML 파싱 검사
        try:
            ET.fromstring(self.xml)
        except ET.ParseError as e:
            issues.append(Issue("XML_PARSE", "XML", str(e)))
            # If parse fails, still attempt to find textual problems below.

        # unescaped & (after typical escape handling)
        for m in re.finditer(r'&(?!amp;|lt;|gt;|quot;|apos;)', self.xml):
            issues.append(Issue("UNESCAPED_AMP", "character", f"Unescaped '&' at pos {m.start()}"))
            break

        # void tags not self-closed
        voids = ["meta","link","img","br","hr","input","source","track"]
        for tag in voids:
            for m in re.finditer(rf'<{tag}\b[^>]*>', self.xml, flags=re.IGNORECASE):
                full = m.group(0)
                if not full.strip().endswith("/>"):
                    issues.append(Issue("VOID_TAG_NOT_SELF_CLOSED", tag, f"Found: {full[:80]}"))
                    break

        # script/style without CDATA
        for m in re.finditer(r'<script\b[^>]*>(.*?)</script>', self.xml, flags=re.IGNORECASE|re.DOTALL):
            content = m.group(1)
            if "<![CDATA[" not in content and ("<" in content or "&" in content):
                issues.append(Issue("SCRIPT_CDATA_MISSING", "script", "script block contains < or & and lacks CDATA"))
                break
        for m in re.finditer(r'<style\b[^>]*>(.*?)</style>', self.xml, flags=re.IGNORECASE|re.DOTALL):
            content = m.group(1)
            if "<![CDATA[" not in content and ("<" in content or "&" in content):
                issues.append(Issue("STYLE_CDATA_MISSING", "style", "style block contains < or & and lacks CDATA"))
                break

        # head include check
        if "<b:include data='blog' name='all-head-content'/>" not in self.xml:
            issues.append(Issue("MISSING_HEAD_INCLUDE", "head", "Missing <b:include data='blog' name='all-head-content'/>"))

        # section/widget existence
        if "<b:section" not in self.xml or "<b:widget" not in self.xml:
            issues.append(Issue("MISSING_SECTION_OR_WIDGET", "structure", "No <b:section> or <b:widget> found"))

        # widget type validity
        types = re.findall(r'<b:widget[^>]*\btype=[\'"]([^\'"]+)[\'"]', self.xml, flags=re.IGNORECASE)
        bad_types = [t for t in types if t not in ALLOWED_WIDGET_TYPES]
        if bad_types:
            issues.append(Issue("INVALID_WIDGET_TYPE", "widget.type", f"Unknown types: {sorted(set(bad_types))}"))

        # duplicate ids
        ids = re.findall(r'\bid=[\'"]([^\'"]+)[\'"]', self.xml, flags=re.IGNORECASE)
        dup = [x for x in set(ids) if ids.count(x) > 1]
        if dup:
            issues.append(Issue("DUPLICATE_ID", "widget.id", f"Duplicate ids: {dup}"))

        # conditional encoding check: presence of == "xxx" pattern (raw quotes)
        if re.search(r'==\s*"[^"]+"', self.xml):
            issues.append(Issue("CONDITIONAL_BAD_QUOTE", "b:if", 'Use &quot; inside cond comparisons: cond=\'data:blog.pageType == &quot;error_page&quot;\''))

        return issues

    # ------------------------
    # 실패 원인 -> 우회/대체 제안 매핑
    # ------------------------
    def suggest_for_issues(self, issues: List[Issue]) -> List[Tuple[Issue, str]]:
        suggestions: List[Tuple[Issue,str]] = []
        for it in issues:
            if it.code == "XML_PARSE":
                suggestions.append((it, "XML 파서 오류입니다. 에러 메시지 위치를 확인하여 해당 줄의 특수문자, 미완성 태그, 잘못된 인용부호를 수동으로 수정하세요. 자동수정으로 해결되지 않으면 원본 소스와 비교하여 변경된 블록을 복원하십시오."))
            elif it.code == "UNESCAPED_AMP":
                suggestions.append((it, "모든 '&'를 '&amp;'로 치환하세요. query string(예: ?id=) 등은 '&amp;id=' 형태로 수정 필요합니다. 자동 교정이 실패하면 해당 URL 문자열의 인용부호 경계를 확인하세요."))
            elif it.code == "VOID_TAG_NOT_SELF_CLOSED":
                suggestions.append((it, "해당 빈 태그를 '<tag ... />' 형태로 자닫으세요. 예: <img src='...' alt='...' />. picture/source 조합일 경우 source와 img 모두 self-close 처리 권장."))
            elif it.code == "SCRIPT_CDATA_MISSING":
                suggestions.append((it, "스크립트 내부의 '<' 또는 '&'를 CDATA로 감싸세요. 예: <script><![CDATA[ ... ]]></script>. 또는 외부 파일로 분리하여 https 경로로 로드하세요."))
            elif it.code == "STYLE_CDATA_MISSING":
                suggestions.append((it, "인라인 스타일에 특수문자가 포함되면 CDATA로 감싸세요. 또는 <b:skin> 내부 CDATA 블록에 CSS를 넣어 관리하세요."))
            elif it.code == "MISSING_HEAD_INCLUDE":
                suggestions.append((it, "헤드에 '<b:include data=\\'blog\\' name=\\'all-head-content\\'/>'를 반드시 추가하세요. 이 include를 제거하면 Blogger 필수 메타/스크립트가 빠집니다."))
            elif it.code == "MISSING_SECTION_OR_WIDGET":
                suggestions.append((it, "템플릿 구조가 손상되었을 가능성 있습니다. 원본 컨템포의 <b:section> 및 위젯 트리를 복원하거나 최소한 하나의 <b:section id='main' ...>와 하나의 <b:widget id='Blog1' type='Blog'/>를 추가하세요."))
            elif it.code == "INVALID_WIDGET_TYPE":
                suggestions.append((it, "허용되지 않은 widget type이 있습니다. Blogger 공식 타입명으로 바꾸거나 해당 위젯을 제거하세요. 예: Search -> BlogSearch, Archive -> BlogArchive"))
            elif it.code == "DUPLICATE_ID":
                suggestions.append((it, "중복된 위젯 ID를 고유한 이름으로 변경하세요. 규칙: 타입명+숫자 (예: BlogArchive1, BlogArchive2)"))
            elif it.code == "CONDITIONAL_BAD_QUOTE":
                suggestions.append((it, "조건문 안의 문자열은 &quot;로 인코딩해야 합니다. 예: cond='data:blog.pageType == &quot;item&quot;'"))
            else:
                suggestions.append((it, "수동 검토 필요. 원본 템플릿과 비교하여 변경된 블록을 되돌리십시오."))
        return suggestions

    # ------------------------
    # 실행 루틴(단일 최종 출력)
    # ------------------------
    def run(self) -> bool:
        for i in range(MAX_ITER):
            # 진단
            issues = self.diagnose()
            if not issues:
                # 최종 성공: 단일 결과만 출력
                print("최종 결과: 완성본")
                return True
            # 자동 교정 시도 (침묵 수행)
            self.auto_fix_all()
            # 다음 루프에서 재진단
        # 루프 종료 후에도 문제 남음 -> 실패 및 분석 출력
        final_issues = self.diagnose()
        print("최종 결과: 실패")
        print("\n원인 분석 및 우회/대체 방안:")
        suggestions = self.suggest_for_issues(final_issues)
        for idx, (issue, advice) in enumerate(suggestions, 1):
            print(f"\n{idx}. 문제 코드: {issue.code}")
            print(f"   대상: {issue.field}")
            print(f"   상세: {issue.detail}")
            print(f"   권장 조치: {advice}")
        # 간단한 요약 제안
        print("\n추가 안내:")
        print("- 자동 교정으로 해결되지 않는 항목은 보통 '구조적 변경' 또는 '위젯 규칙 위반'입니다.")
        print("- 권장 순서: 원본 컨템포 파일과 비교 → 헤드 include, 섹션/위젯 트리, 위젯 type/id 우선 복원 → 재시도")
        return False

# ------------------------
# CLI
# ------------------------
def main():
    if len(sys.argv) < 2:
        print("Usage: python blogger_validator.py target.xml")
        sys.exit(1)
    path = sys.argv[1]
    try:
        with open(path, encoding="utf-8") as f:
            txt = f.read()
    except Exception as e:
        print("파일을 읽을 수 없습니다:", e)
        sys.exit(1)

    v = BloggerValidator(txt)
    ok = v.run()
    # 스크립트는 결과만으로 종료 코드 반환
    sys.exit(0 if ok else 2)

if __name__ == "__main__":
    main()
