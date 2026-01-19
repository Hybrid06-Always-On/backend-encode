pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "arjleun581/backend-encode"           // 도커 이미지 이름
        DOCKER_TAG = "${BUILD_NUMBER}.0"                    // 젠킨스 빌드 번호를 태그로 활용
        DOCKER_CREDENTIALS_ID = 'docker-jieun'             // 도커허브 인증 정보 ID
        
        HELM_REPO_URL = "github.com/Hybrid06-Always-On/helm_chart.git" // 헬름 차트 레포 주소
        HELM_CREDENTIALS_ID = 'backend'                    // 헬름 레포 접근용 깃허브 인증 정보 ID
    }

    stages {
        // 1단계: 소스코드 가져오기
        stage('Checkout Source') {
            steps {
                git branch: 'main', url: 'https://github.com/Hybrid06-Always-On/backend-encode.git'
            }
        }

        // 2단계: 도커 이미지 빌드 및 푸시
        stage('Build and Push Docker Image') {
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', "${DOCKER_CREDENTIALS_ID}") {
                        def customImage = docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                        customImage.push()   
                        customImage.push("latest")
                    }
                }
            }
        }

        // 3단계: 헬름 차트 레포지토리 업데이트
        stage('Update Helm Chart and Push') {
            steps {
                script {
                    // 깃허브 인증 정보 가져오기
                    withCredentials([usernamePassword(credentialsId: "${HELM_CREDENTIALS_ID}", usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        
                        sh """
                        # yq 설치 (로컬 실행 파일로 다운로드)
                        if [ ! -f "./yq" ]; then
                            curl -sL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -o ./yq
                            chmod +x ./yq
                        fi

                        # 기존 폴더 삭제 및 헬름 레포지토리 클론
                        rm -rf helm-temp
                        git clone https://${GIT_USER}:${GIT_PASS}@${HELM_REPO_URL} helm-temp
                        
                        cd helm-temp

                        # main 브랜치로 전환
                        git checkout main

                        # 사용자 정보 설정
                        git config user.email "arjleun19@gmail.com"
                        git config user.name "leeeeejieun"

                        # 이미지 태그 업데이트
                        ../yq -i '(.. | select(has("repository") and .repository == "${DOCKER_IMAGE}")).tag = "${DOCKER_TAG}"' charts/backend/values.yaml

                        # 변경된 파일 스테이징
                        git add charts/backend/values.yaml
                        
                        # 변경 사항이 있는 경우에만 커밋 및 푸시 진행
                        if [ -n "\$(git status --porcelain)" ]; then
                            git commit -m "Update ${DOCKER_IMAGE} tag to ${DOCKER_TAG}"
                            git remote set-url origin https://${GIT_USER}:${GIT_PASS}@${HELM_REPO_URL}
                            git push origin main
                        else
                            echo "No changes detected, skipping commit"
                        fi
                        """
                    }
                }
            }
        }
    }
}
