#!/bin/bash
# Script de despliegue de infraestructura para Exam Simulator
# Este script crea las tablas de DynamoDB necesarias para el funcionamiento sin mocks.

REGION="us-east-2"
STACK_NAME="exam-simulator-db"

echo "🚀 Iniciando despliegue de infraestructura en la región $REGION..."

aws cloudformation deploy \
  --template-file infra/dynamodb.yml \
  --stack-name "$STACK_NAME" \
  --region "$REGION"

if [ $? -eq 0 ]; then
  echo "✅ Infraestructura desplegada exitosamente."
  echo "Tablas creadas:"
  echo " - ExamSimulator-Simulators"
  echo " - ExamSimulator-Questions"
  echo " - ExamSimulator-Attempts"
  echo ""
  echo "⚠️  RECUERDA: Asegúrate de que el usuario de AWS configurado en .env tenga permisos 'dynamodb:*' sobre estas tablas."
else
  echo "❌ Error en el despliegue. Verifica tus credenciales de AWS y permisos de CloudFormation."
  exit 1
fi
