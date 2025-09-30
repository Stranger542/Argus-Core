import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-teal-300">About Argus Core</h1>
      
      <div className="space-y-8">
        {/* Overview */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 text-teal-300">Overview</h2>
          <p className="text-gray-300 leading-relaxed">
            Argus Core is an advanced automated surveillance system designed for real-time fight and violence detection 
            in CCTV footage. Built with cutting-edge machine learning technology, it provides continuous monitoring 
            with instant alerts and evidence collection capabilities.
          </p>
        </div>

        {/* Features */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 text-teal-300">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-white">Real-time Detection</h3>
                  <p className="text-gray-400 text-sm">Continuous monitoring with instant anomaly detection</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-white">Multi-Camera Support</h3>
                  <p className="text-gray-400 text-sm">Monitor multiple camera feeds simultaneously</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-white">Evidence Collection</h3>
                  <p className="text-gray-400 text-sm">Automatic video clip saving for incidents</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-white">Email Alerts</h3>
                  <p className="text-gray-400 text-sm">Instant notifications with video attachments</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-white">Web Dashboard</h3>
                  <p className="text-gray-400 text-sm">Modern web interface for monitoring and management</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-white">Secure Authentication</h3>
                  <p className="text-gray-400 text-sm">JWT-based user authentication and authorization</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 text-teal-300">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">Frontend</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• React 19 with TypeScript</li>
                <li>• Tailwind CSS for styling</li>
                <li>• React Router for navigation</li>
                <li>• Axios for API communication</li>
                <li>• Vite for build tooling</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Backend & ML</h3>
              <ul className="space-y-2 text-gray-300">
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
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 text-teal-300">Machine Learning</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Argus Core utilizes state-of-the-art deep learning models for anomaly detection:
          </p>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-white">R3D-18 Architecture</h3>
                <p className="text-gray-400 text-sm">3D ResNet model for video action recognition</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-white">Multi-Class Detection</h3>
                <p className="text-gray-400 text-sm">Detects various types of violence and anomalies</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-white">Real-time Processing</h3>
                <p className="text-gray-400 text-sm">Optimized for low-latency video analysis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dataset Information */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 text-teal-300">Training Data</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            The system is trained on comprehensive datasets for robust performance:
          </p>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-white">UCF-Crime Dataset</h3>
                <p className="text-gray-400 text-sm">Large-scale dataset with 13 crime categories</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-white">RWF-2000 Dataset</h3>
                <p className="text-gray-400 text-sm">Real-world fight detection dataset</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 text-teal-300">Contact & Support</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-white">Version</h3>
              <p className="text-gray-300">1.0.0</p>
            </div>
            <div>
              <h3 className="font-semibold text-white">License</h3>
              <p className="text-gray-300">Educational and Research Purposes</p>
            </div>
            <div>
              <h3 className="font-semibold text-white">Documentation</h3>
              <p className="text-gray-300">Available in the project repository</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-yellow-300">Important Notice</h2>
          <p className="text-yellow-200 text-sm leading-relaxed">
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
