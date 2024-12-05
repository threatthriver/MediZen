# MediZen - AI-Powered Medical Assistant Platform

## Overview
MediZen is an AI-powered medical assistant platform designed to support healthcare professionals by providing advanced AI-driven insights and tools. The platform aims to improve diagnostic and treatment processes through modern, intuitive interfaces and robust backend systems.

## Features
- AI-driven medical insights
- Secure authentication with Firebase
- Responsive design with Microsoft Fluent Design principles
- Integration with Cerebras AI services
- Rate limiting and security measures

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/MediZen.git
   cd MediZen
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in a `.env` file:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   CEREBRAS_API_KEY=your_cerebras_api_key
   PORT=3000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment
MediZen is ready for deployment on Vercel. Ensure all environment variables are set correctly in the Vercel dashboard.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License.
