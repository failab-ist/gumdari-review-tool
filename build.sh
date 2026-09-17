#!/bin/bash
# 검대리 배포 파일 만들기 — src/ 재료를 하나의 HTML 로 합칩니다
#   bash build.sh
#
# 결과물: 검대리_v1.0.2.html + index.html
set -e
VER="1.0.2"
OUT="검대리_v${VER}.html"

{
  sed "s/__APPNAME__/검대리/g" src/head.html
  echo "<style>"; cat src/style.css; echo "</style>"
  echo "</head>"
  # 푸터 자리 표시를 채웁니다
  awk '/<!--FOOTER-->/ { while ((getline line < "src/footer.html") > 0) print line; next }
       { print }' src/body.html
  echo "<script>"
  for f in core zip parser rules ai settings review; do
    if [ "$f" = core ]; then sed "s/__APPNAME__/검대리/g" "src/$f.js"
    else cat "src/$f.js"; fi
    echo
  done
  echo "</script>"
  echo "<script>"; cat src/rail.js; echo "</script>"
  echo "</body>"; echo "</html>"
} > "$OUT"
cp "$OUT" index.html
echo "완성 → $OUT + index.html  ($(wc -c < "$OUT") bytes)"
