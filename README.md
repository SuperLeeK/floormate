# 🐾 Dopamine Sidey (도파민 사이디)

화면 가장자리에 작은 픽셀 동물 친구들이 총총 머물며, 실시간 상태(온라인, 작업중, 자리비움, 수면)와 말풍선, 귀여운 상호작용(쿡 찌르기, 하트, 쓰다듬기)을 나눌 수 있는 데스크톱 오버레이 메신저입니다.

---

## 📁 프로젝트 구조

```
dopamine-sidey/
├── server/                 # 중계 백엔드 (Node.js + Socket.io + Docker)
│   ├── src/index.ts        # 실시간 방/상태/메시지 중계 로직
│   ├── Dockerfile          # 오라클 클라우드 배포용 Dockerfile
│   └── docker-compose.yml  # 원클릭 배포 설정
│
└── client/                 # 데스크톱 오버레이 메신저 (Electron + React)
    ├── electron/           # 투명 윈도우 & 마우스 클릭 관통(Click-Through) 제어
    └── src/                # 픽셀 캐릭터, 말풍선, 상호작용 UI
```

---

## 🚀 빠른 시작 가이드 (로컬 개발 & ngrok 터널링)

### 1. 중계 서버 실행 (Mac 로컬)

```bash
cd server
npm install
npm run dev
```
* 서버가 `http://localhost:3001`에서 실행됩니다.

### 2. ngrok으로 지인들에게 서버 공유하기

새 터미널 창을 열고 ngrok으로 3001 포트를 외부로 공개합니다:

```bash
ngrok http 3001
```
* 출력되는 공인 주소(예: `https://xxxx-xx-xx.ngrok-free.app`)를 복사합니다.

### 3. 클라이언트 실행 (데스크톱 오버레이 메신저)

```bash
cd client
npm install
npm run dev
```
* 화면 우측 가장자리에 투명 오버레이 메신저 창이 뜹니다.
* 상단 톱니바퀴(설정) 아이콘을 눌러:
  * **서버 주소**: 로컬 테스트 시 `http://localhost:3001`, 지인들과 테스트 시 복사한 `ngrok 주소` 입력
  * **방 이름**: 친구들과 맞출 방 이름 (예: `dopamine-gang`) 입력
  * **닉네임 및 캐릭터**: 치즈냥이, 시바댕댕, 흰토끼, 햄스터, 붉은여우, 아기곰 중 선택!

---

## ☁️ 추후 오라클 클라우드 배포 방법

오라클 클라우드 VM에 `server/` 디렉토리를 복사한 뒤 다음 명령어를 실행하면 백그라운드에서 영구 가동됩니다:

```bash
cd server
docker compose up -d
```
* 서버의 공인 IP 또는 도메인의 3001번 포트를 클라이언트의 서버 주소로 설정하면 완료됩니다.
# dopamine-sidey
