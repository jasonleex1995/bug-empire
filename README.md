# bug-empire

곤충 제국 레인 전쟁. Age of War + Plants vs. Zombies + StarCraft 업그레이드를 섞은 싱글 플레이 웹 게임 프로토타입.

- 기획과 수치: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)
- 배포: GitHub Pages 프로젝트 페이지 (`https://<user>.github.io/bug-empire/`). `main`에 푸시하면 `.github/workflows/deploy.yml`이 빌드·배포한다. 저장소 Settings → Pages에서 Source를 **GitHub Actions**로 한 번 설정해야 한다.

## 개발

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run typecheck
```

## 밸런스 시뮬레이션 (렌더링 없이 AI vs AI)

```bash
npm run sim -- --a balanced --b defenseOnly --games 20
npm run sim -- --matrix --games 8
npm run sim -- --a reactive --b rush --games 10 --timeLimit 900 --verbose
```

## 구조

```
src/
  sim/            결정론적 시뮬레이션. 렌더링과 완전히 분리되어 있어 헤드리스로 돈다.
    config.ts     격자 크기, 성 HP, 가스 보상 등 전역 수치
    data/         유닛 · 모듈 · 업그레이드 표 (밸런스는 여기서)
    state.ts      게임 상태와 초기화
    actions.ts    플레이어/AI가 내리는 명령 (설치, 업그레이드, 해금, 비상 방어 ...)
    combat.ts     피해 계산, 가스 보상
    step.ts       한 틱(1/20초) 진행: 이동, 전투, 생산, 시야
    ai/           AI 프로필과 컨트롤러 (난이도 프리셋 포함)
  ui/             Canvas 2D 렌더러와 레이아웃
  headless/       AI vs AI 러너
  main.ts         브라우저 게임 루프와 입력
```
