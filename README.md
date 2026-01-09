# Agentic Exam Simulator

An intelligent exam preparation platform powered by AI agents that helps you study for technical certifications through adaptive learning and realistic exam simulations.

## 🎯 What is Agentic Exam Simulator?

Agentic Exam Simulator is a modern web application designed to revolutionize how you prepare for technical certifications. It combines the power of AI agents with interactive learning to provide:

- **AI-Powered Exam Discovery**: The Librarian Agent automatically finds and structures certification exams based on your search queries
- **Dual Learning Modes**: Choose between interactive simulator mode with immediate feedback or realistic exam mode with time constraints
- **Intelligent Question Generation**: The Solver Agent creates contextual explanations and adaptive learning experiences
- **Performance Analytics**: Track your progress across different technical domains with detailed charts and statistics
- **Study Commitment Tracking**: Set and maintain study schedules with streak tracking to build consistent learning habits

### Key Features

🤖 **AI Agents**
- **Librarian Agent**: Discovers certification blueprints and exam structures
- **Solver Agent**: Provides intelligent explanations and adaptive feedback

📚 **Learning Modes**
- **Simulator Mode**: Interactive learning with immediate feedback and AI explanations
- **Real Exam Mode**: Timed practice exams that simulate actual certification conditions

📊 **Progress Tracking**
- Performance analytics by technical domain
- Study streak tracking
- Detailed exam attempt history
- Visual progress charts

⚡ **Smart Features**
- Responsive design for desktop and mobile
- Study commitment scheduler
- Real-time performance feedback
- Domain-specific progress analysis

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 18.0 or higher)
- **npm** (comes with Node.js) or **yarn**

You can check your versions by running:
```bash
node --version
npm --version
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentic_simulator_exams-1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   Or if you prefer yarn:
   ```bash
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Or with yarn:
   ```bash
   yarn dev
   ```

4. **Open your browser**
   
   Navigate to `http://localhost:5173` to see the application running.

### Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## 🏗️ Project Structure

```
src/
├── agents/           # AI agents for exam discovery and solving
│   ├── librarian.ts  # Exam discovery and blueprint extraction
│   └── solver.ts     # Question solving and explanation generation
├── components/       # React components
│   ├── BottomBar.tsx        # Navigation bar
│   ├── ExamResults.tsx      # Results display
│   ├── HistoryView.tsx      # Exam attempt history
│   ├── PerformanceChart.tsx # Analytics visualization
│   ├── QuestionCard.tsx     # Individual question display
│   ├── RealExamView.tsx     # Timed exam mode
│   ├── SimulatorView.tsx    # Interactive learning mode
│   └── StudyCommitment.tsx  # Study schedule configuration
├── types/            # TypeScript type definitions
│   └── index.ts      # Core data types and interfaces
├── App.tsx           # Main application component
└── main.tsx          # Application entry point
```

## 🎮 How to Use

### 1. Discover Exams
- Navigate to the "Discover" tab
- Search for certifications (e.g., "AWS Solutions Architect", "Azure Data Fundamentals")
- The Librarian Agent will find and structure the exam for you

### 2. Set Study Commitment
- Configure your study schedule when prompted
- Set preferred days and times for studying
- Track your study streak to maintain consistency

### 3. Choose Learning Mode
- **Simulator Mode**: Interactive learning with immediate feedback
  - Get instant explanations for each answer
  - Learn from mistakes in real-time
  - Perfect for understanding concepts
  
- **Real Exam Mode**: Realistic exam simulation
  - Timed sessions matching actual exam duration
  - Results shown only at the end
  - Ideal for testing your readiness

### 4. Track Progress
- View your performance analytics in the "Stats" tab
- Monitor progress across different technical domains
- Review your exam attempt history
- Identify areas that need more focus

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: CSS with custom properties and responsive design
- **Charts**: Recharts for performance visualization
- **Icons**: Lucide React for consistent iconography
- **State Management**: React hooks for local state management

## 🔧 Development

### Code Quality

The project includes ESLint configuration for maintaining code quality:

```bash
npm run lint
```

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the browser console for error messages
2. Ensure all dependencies are properly installed
3. Verify that you're using a supported Node.js version (18+)
4. Try clearing your browser cache and restarting the development server

## 🗄️ Database Configuration

### Development Environment

For local development, the application uses browser localStorage for data persistence. No additional database setup is required for basic functionality.

If you want to add a persistent database for development:

1. **Install a local database** (PostgreSQL recommended):
   ```bash
   # On macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # On Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create a development database**:
   ```sql
   CREATE DATABASE agentic_exam_simulator_dev;
   CREATE USER exam_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE agentic_exam_simulator_dev TO exam_user;
   ```

3. **Environment variables** (create `.env.local`):
   ```env
   DATABASE_URL=postgresql://exam_user:your_password@localhost:5432/agentic_exam_simulator_dev
   NODE_ENV=development
   ```

### Production Database (AWS RDS)

For production deployment, we recommend using AWS RDS with PostgreSQL:

1. **Create RDS Instance**:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier agentic-exam-simulator-prod \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username examadmin \
     --master-user-password YourSecurePassword123! \
     --allocated-storage 20 \
     --vpc-security-group-ids sg-xxxxxxxxx \
     --db-subnet-group-name your-subnet-group
   ```

2. **Database Schema Setup**:
   ```sql
   -- Connect to your RDS instance and run:
   CREATE DATABASE agentic_exam_simulator;
   
   -- Example tables (adjust based on your needs)
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     preferred_language VARCHAR(10) DEFAULT 'en',
     streak INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE TABLE exams (
     id VARCHAR(50) PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     provider VARCHAR(100) NOT NULL,
     duration_minutes INTEGER NOT NULL,
     domains JSONB NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE TABLE exam_attempts (
     id VARCHAR(50) PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     exam_id VARCHAR(50) REFERENCES exams(id),
     mode VARCHAR(20) NOT NULL,
     start_time TIMESTAMP NOT NULL,
     end_time TIMESTAMP,
     questions JSONB NOT NULL,
     status VARCHAR(20) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

## ☁️ AWS Deployment

### Prerequisites for AWS Deployment

- AWS CLI installed and configured
- AWS account with appropriate permissions
- Domain name (optional, for custom domain)

### Option 1: AWS Amplify (Recommended for Frontend)

AWS Amplify provides the easiest deployment for React applications:

1. **Install Amplify CLI**:
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

2. **Initialize Amplify in your project**:
   ```bash
   amplify init
   ```

3. **Add hosting**:
   ```bash
   amplify add hosting
   # Choose "Amazon CloudFront and S3"
   ```

4. **Deploy**:
   ```bash
   npm run build
   amplify publish
   ```

5. **Environment Variables** (for production):
   ```bash
   # Set in Amplify Console > App Settings > Environment Variables
   DATABASE_URL=your-rds-connection-string
   NODE_ENV=production
   AWS_REGION=us-east-1
   ```

### Option 2: AWS S3 + CloudFront (Manual Setup)

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Create S3 bucket**:
   ```bash
   aws s3 mb s3://your-app-bucket-name --region us-east-1
   ```

3. **Configure S3 for static website hosting**:
   ```bash
   aws s3 website s3://your-app-bucket-name \
     --index-document index.html \
     --error-document index.html
   ```

4. **Upload build files**:
   ```bash
   aws s3 sync dist/ s3://your-app-bucket-name --delete
   ```

5. **Create CloudFront distribution**:
   ```json
   {
     "CallerReference": "agentic-exam-simulator-2024",
     "Origins": {
       "Quantity": 1,
       "Items": [
         {
           "Id": "S3-your-app-bucket-name",
           "DomainName": "your-app-bucket-name.s3.amazonaws.com",
           "S3OriginConfig": {
             "OriginAccessIdentity": ""
           }
         }
       ]
     },
     "DefaultCacheBehavior": {
       "TargetOriginId": "S3-your-app-bucket-name",
       "ViewerProtocolPolicy": "redirect-to-https",
       "TrustedSigners": {
         "Enabled": false,
         "Quantity": 0
       },
       "ForwardedValues": {
         "QueryString": false,
         "Cookies": {
           "Forward": "none"
         }
       }
     },
     "Comment": "Agentic Exam Simulator Distribution",
     "Enabled": true
   }
   ```

### Option 3: AWS ECS (For Full-Stack Applications)

If you plan to add a backend API:

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **Build and push to ECR**:
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name agentic-exam-simulator
   
   # Build and tag image
   docker build -t agentic-exam-simulator .
   docker tag agentic-exam-simulator:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/agentic-exam-simulator:latest
   
   # Push to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/agentic-exam-simulator:latest
   ```

3. **Create ECS service**:
   ```bash
   # Create task definition and service using AWS Console or CLI
   aws ecs create-service \
     --cluster your-cluster-name \
     --service-name agentic-exam-simulator \
     --task-definition agentic-exam-simulator:1 \
     --desired-count 2
   ```

### Environment Configuration for AWS

Create different environment files for different stages:

**`.env.development`**:
```env
VITE_API_URL=http://localhost:3001
VITE_DATABASE_URL=postgresql://exam_user:password@localhost:5432/agentic_exam_simulator_dev
VITE_AWS_REGION=us-east-1
```

**`.env.production`**:
```env
VITE_API_URL=https://api.your-domain.com
VITE_DATABASE_URL=postgresql://examadmin:password@your-rds-endpoint:5432/agentic_exam_simulator
VITE_AWS_REGION=us-east-1
VITE_CLOUDFRONT_DOMAIN=https://your-cloudfront-domain.cloudfront.net
```

### Security Considerations

1. **IAM Roles and Policies**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "rds:DescribeDBInstances",
           "rds:Connect"
         ],
         "Resource": "*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject"
         ],
         "Resource": "arn:aws:s3:::your-app-bucket-name/*"
       }
     ]
   }
   ```

2. **VPC Configuration**: Ensure your RDS instance is in a private subnet
3. **Security Groups**: Configure appropriate inbound/outbound rules
4. **SSL/TLS**: Use HTTPS for all communications
5. **Environment Variables**: Store sensitive data in AWS Systems Manager Parameter Store or AWS Secrets Manager

### Monitoring and Logging

1. **CloudWatch Integration**:
   ```bash
   # Enable CloudWatch logs for your application
   aws logs create-log-group --log-group-name /aws/agentic-exam-simulator
   ```

2. **Application Performance Monitoring**:
   - Use AWS X-Ray for distributed tracing
   - Set up CloudWatch alarms for key metrics
   - Monitor RDS performance metrics

### Cost Optimization

- Use AWS Free Tier resources when possible
- Implement CloudFront caching to reduce S3 requests
- Use RDS reserved instances for production
- Set up billing alerts and cost monitoring

## 🔮 Future Enhancements

- Integration with real certification provider APIs
- Advanced AI-powered question generation
- Collaborative study features
- Mobile app development
- Multi-language support
- Advanced analytics and insights
- Real-time collaboration features
- Integration with AWS Cognito for user authentication
- Serverless backend with AWS Lambda
- Advanced caching strategies with Redis
