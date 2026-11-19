pipeline {
    agent any

    tools {
        nodejs 'nodejs-22'
    }

    environment {
        CI = 'true'
        NEXT_TELEMETRY_DISABLED = '1'
    }

    options {
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('administration-interface') {
                    sh 'npm ci'
                }
            }
        }

        stage('Lint') {
            steps {
                dir('administration-interface') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Type Check') {
            steps {
                dir('administration-interface') {
                    sh 'npm run typecheck'
                }
            }
        }

        stage('Unit Tests') {
            steps {
                dir('administration-interface') {
                    sh 'npm run test:ci || npm run test'
                }
            }
        }

        stage('Build') {
            steps {
                dir('administration-interface') {
                    sh 'npm run build'
                }
            }
        }

        stage('Code Quality Checks') {
            parallel {
                stage('ESLint Report') {
                    steps {
                        dir('administration-interface') {
                            sh 'npx eslint . --format json --output-file eslint-report.json || true'
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'administration-interface/eslint-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }

        stage('Package Docker Image') {
            when {
                branch 'main'
            }
            steps {
                dir('administration-interface') {
                    script {
                        def imageTag = "${env.BUILD_NUMBER}"
                        sh """
                            docker build -t administration-interface:${imageTag} .
                            docker tag administration-interface:${imageTag} administration-interface:latest
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully'
        }
        failure {
            echo 'Pipeline failed'
        }
        always {
            cleanWs()
        }
    }
}
