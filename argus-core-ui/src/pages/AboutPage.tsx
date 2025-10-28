// src/pages/AboutPage.tsx
import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="page-container about-page-container">
      <h1>About Argus Core</h1>
      
      <div className="info-card-container">
        {/* Overview */}
        <div className="info-card">
          <h2>Overview</h2>
          <p>
            Argus Core is an advanced automated surveillance system designed for real-time fight and violence detection 
            in CCTV footage. Built with cutting-edge machine learning technology, it provides continuous monitoring 
            with instant alerts and evidence collection capabilities.
          </p>
        </div>

        {/* Features */}
        <div className="info-card">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>Real-time Detection</h3>
              <p>Continuous monitoring with instant anomaly detection</p>
            </div>
            <div className="feature-item">
              <h3>Multi-Camera Support</h3>
              <p>Monitor multiple camera feeds simultaneously</p>
            </div>
            <div className="feature-item">
              <h3>Evidence Collection</h3>
              <p>Automatic video clip saving for incidents</p>
            </div>
            <div className="feature-item">
              <h3>Email Alerts</h3>
              <p>Instant notifications with video attachments</p>
            </div>
            <div className="feature-item">
              <h3>Web Dashboard</h3>
              <p>Modern web interface for monitoring and management</p>
            </div>
            <div className="feature-item">
              <h3>Secure Authentication</h3>
              <p>JWT-based user authentication and authorization</p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="info-card">
          <h2>Technology Stack</h2>
          <div className="tech-stack-grid">
            <div>
              <h3>Frontend</h3>
              <ul>
                <li>• React 19 with TypeScript</li>
                <li>• Tailwind CSS for styling</li>
                <li>• React Router for navigation</li>
                <li>• Axios for API communication</li>
                <li>• Vite for build tooling</li>
              </ul>
            </div>
            <div>
              <h3>Backend & ML</h3>
              <ul>
                <li>• FastAPI with Python</li>
                <li>• PyTorch for deep learning</li>
                <li>• OpenCV for video processing</li>
                <li>• SQLAlchemy for database</li>
                <li>• JWT for authentication</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Machine Learning */}
        <div className="info-card">
          <h2>Machine Learning</h2>
          <p>
            Argus Core utilizes state-of-the-art deep learning models for anomaly detection:
          </p>
          <div className="feature-item">
            <h3>R3D-18 Architecture</h3>
            <p>3D ResNet model for video action recognition</p>
          </div>
          <div className="feature-item">
            <h3>Multi-Class Detection</h3>
            <p>Detects various types of violence and anomalies</p>
          </div>
          <div className="feature-item">
            <h3>Real-time Processing</h3>
            <p>Optimized for low-latency video analysis</p>
          </div>
        </div>

        {/* Dataset Information */}
        <div className="info-card">
          <h2>Training Data</h2>
          <p>
            The system is trained on comprehensive datasets for robust performance:
          </p>
          <div className="feature-item">
            <h3>UCF-Crime Dataset</h3>
            <p>Large-scale dataset with 13 crime categories</p>
          </div>
          <div className="feature-item">
            <h3>RWF-2000 Dataset</h3>
            <p>Real-world fight detection dataset</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="info-card disclaimer">
          <h2>Important Notice</h2>
          <p>
            This system is designed for educational and research purposes. Please ensure compliance with 
            local privacy laws and regulations when deploying in production environments. Always respect 
            individual privacy rights and obtain necessary permissions before monitoring public or private spaces.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;