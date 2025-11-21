# SimpleMind MCP Server

대화를 통해 SimpleMind 마인드맵을 생성하고 편집할 수 있는 MCP 서버입니다.

## 기능

- ✅ 새 마인드맵 생성
- ✅ 기존 마인드맵 읽기
- ✅ 토픽 추가/수정/삭제
- ✅ iCloud Drive 자동 동기화

## 설치

```bash
cd /Users/c/.gemini/antigravity/scratch/simplemind-mcp-server
npm install
npm run build
```

## 설정

`.env` 파일에서 iCloud Drive 경로를 확인하세요:

```bash
SIMPLEMIND_ICLOUD_PATH=/Users/c/Library/Mobile Documents/iCloud~eu~simplemind/Documents
```

## Antigravity에 연결하기

Antigravity의 MCP 설정 파일에 다음을 추가하세요:

**Claude Desktop 설정 파일 위치:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

**설정 예시:**

```json
{
  "mcpServers": {
    "simplemind": {
      "command": "node",
      "args": [
        "/Users/c/.gemini/antigravity/scratch/simplemind-mcp-server/dist/index.js"
      ],
      "env": {
        "SIMPLEMIND_ICLOUD_PATH": "/Users/c/Library/Mobile Documents/iCloud~eu~simplemind/Documents"
      }
    }
  }
}
```

## 사용 예시

Antigravity와 대화하면서 마인드맵을 만들 수 있습니다:

**새 마인드맵 만들기:**
```
"프로젝트 기획 마인드맵 만들어줘"
```

**토픽 추가:**
```
"프로젝트 기획 마인드맵에 '목표', '일정', '팀 구성' 토픽 추가해줘"
```

**기존 마인드맵 보기:**
```
"내 마인드맵 목록 보여줘"
```

**토픽 수정:**
```
"목표 토픽에 '2025년 Q1 완료' 노트 추가해줘"
```

## 사용 가능한 도구

- `list_mindmaps`: 모든 마인드맵 목록
- `create_mindmap`: 새 마인드맵 생성
- `read_mindmap`: 마인드맵 읽기
- `add_topic`: 토픽 추가
- `update_topic`: 토픽 수정
- `delete_topic`: 토픽 삭제

## 주의사항

⚠️ SimpleMind 앱과 MCP 서버를 동시에 같은 파일을 편집하지 마세요. 충돌이 발생할 수 있습니다.

## 파일 형식

SimpleMind는 `.smmx` 확장자를 사용하며, 내부적으로 XML 형식입니다.
