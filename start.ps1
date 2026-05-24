# J-Pop 가사 번역 앱 실행 스크립트
# ELECTRON_RUN_AS_NODE 환경변수를 지우고 실행합니다

$env:ELECTRON_RUN_AS_NODE = ""
npm run dev
