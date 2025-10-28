// src/components/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const AppLayout: React.FC = () => {
  return (
    <div className="app-container">
      <Header />
      <main className="content-container">
        <Outlet /> {/* Child routes (HomePage, AboutPage, etc.) render here */}
      </main>
    </div>
  );
};

export default AppLayout;