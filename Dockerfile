FROM node:20-alpine

# FFmpeg 설치 (Alpine Linux 패키지 관리자 사용)
RUN apk add --no-cache ffmpeg

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 실행 명령 
CMD ["node", "index.js"]
