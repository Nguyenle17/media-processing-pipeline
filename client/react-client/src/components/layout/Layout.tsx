import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="vs-app">
      <a className="vs-skip-link" href="#main-content">Skip to content</a>
      <Header />
      <main id="main-content" className="vs-main">{children}</main>
      <Footer />
    </div>
  );
}
